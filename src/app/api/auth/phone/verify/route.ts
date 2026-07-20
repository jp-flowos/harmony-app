import { createHmac } from "node:crypto";
import { and, count, eq, gte } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { authAttempts, profiles } from "@/db/schema";
import { errorResponse, serverError, successResponse, validationError } from "@/lib/api-response";
import { classifyOtpError, otpFailureMessage } from "@/lib/auth-errors";
import { toE164KR } from "@/lib/auth-utils";
import { decideVerify, POLICY_WINDOW_MS } from "@/lib/otp-policy";
import { createClient } from "@/lib/supabase/server";

// zod의 기본 이슈 메시지(예: "Invalid input: expected string, received undefined")는
// 영문이라 그대로 노출하면 안 된다 — 아래 정규식 커스텀 메시지는 code가 "존재하지만
// 형식이 틀린" 경우에만 쓰이고, 필드가 아예 없을 때는 zod가 이 메시지 대신 기본
// 영문 메시지를 낸다. 그래서 실패 처리부는 이 상수를 zod 메시지와 별개로 재사용한다.
const CODE_FORMAT_MESSAGE = "인증번호는 숫자 6자리예요";

const VerifySchema = z.object({
  phone: z.string().min(1),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, CODE_FORMAT_MESSAGE),
});

function phoneKey(e164: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "harmony-dev-secret";
  return createHmac("sha256", secret).update(`otp:${e164}`).digest("hex").slice(0, 32);
}

// POST /api/auth/phone/verify — 인증번호 확인 후 세션 발급.
// verifyOtp가 성공하면 Supabase가 세션 쿠키를 심는다 (server client의 setAll 어댑터).
//
// 실패 카운터는 verifyOtp(느린 외부 호출)보다 먼저 insert한다 — send 라우트와 동일한
// insert-then-count 규율이다. "먼저 카운트 → await verifyOtp → 나중에 insert" 순서였다면
// verifyOtp가 왕복하는 동안 도착한 동시 요청들이 전부 같은 pre-write 상태(recentFails=0 등)를
// 읽어 5회 한도를 다같이 우회할 수 있다 (같은 번호로 수십 개 동시 브루트포스 → 전부 통과).
// insert를 먼저 하면 동시 요청들이 서로의 예약 행을 카운트에서 보게 되어 경합 창이
// (verifyOtp 왕복 전체가 아니라) INSERT 문 사이의 짧은 간격으로 좁아진다.
//
// 다만 이 행은 아직 "진짜 오답"인지 모르는 예약(reservation)이다. 원칙은 "실제로 틀린
// 코드를 넣은 시도만 5회 한도를 소모한다" — 우리 쪽 fail_limit 게이트에 막히거나
// verifyOtp가 우리/Supabase 인프라 문제(send_limit, unknown)로 실패하면 사용자가 코드를
// 틀린 게 아니므로 방금 넣은 예약 행을 즉시 환불(삭제)한다. code_mismatch/code_expired만
// "진짜 오답 시도"로 보고 행을 남겨 카운터를 소모한다.
export async function POST(request: NextRequest) {
  const parsed = VerifySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    // phone 필드 자체가 없거나 형식이 틀리면 zod 기본(영문) 메시지가 붙을 수 있으므로
    // 절대 그대로 노출하지 않는다 — phone 쪽 이슈가 있으면 항상 한국어 invalid_phone
    // 메시지로, 아니면(=code만 문제) 위의 CODE_FORMAT_MESSAGE로 고정한다.
    const hasPhoneIssue = parsed.error.issues.some((issue) => issue.path[0] === "phone");
    return validationError(
      hasPhoneIssue ? otpFailureMessage("invalid_phone") : CODE_FORMAT_MESSAGE
    );
  }

  const e164 = toE164KR(parsed.data.phone);
  if (!e164) {
    return validationError(otpFailureMessage("invalid_phone"));
  }

  const key = phoneKey(e164);
  let reservedId: string | null = null;

  try {
    const since = new Date(Date.now() - POLICY_WINDOW_MS);

    // 카운트보다 먼저 예약 행을 insert — 동시 요청들이 서로의 행을 카운트에서 보게
    // 하기 위해서다. 판정에 막히거나 진짜 오답이 아닌 것으로 밝혀지면 아래에서 환불한다.
    const [reserved] = await db
      .insert(authAttempts)
      .values({ ip: key, action: "otp_fail_target" })
      .returning({ id: authAttempts.id });
    reservedId = reserved?.id ?? null;

    const [failRow] = await db
      .select({ value: count() })
      .from(authAttempts)
      .where(
        and(
          eq(authAttempts.ip, key),
          eq(authAttempts.action, "otp_fail_target"),
          gte(authAttempts.createdAt, since)
        )
      );
    // 방금 넣은 자기 자신의 예약 행이 카운트에 포함돼 있으므로 1을 뺀다 (send 라우트와 동일 패턴).
    const recentFails = (failRow?.value ?? 0) - 1;

    const gate = decideVerify({ recentFails });
    if (!gate.allowed) {
      // 우리 쪽 레이트리밋 판정이지 사용자가 틀린 코드를 넣은 게 아니다 — 환불한다.
      if (reservedId) {
        await db.delete(authAttempts).where(eq(authAttempts.id, reservedId));
      }
      return errorResponse("FAIL_LIMIT", otpFailureMessage("fail_limit"), 429);
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      phone: e164,
      token: parsed.data.code,
      type: "sms",
    });

    if (error || !data.session || !data.user) {
      const reason = error ? classifyOtpError(error) : "code_mismatch";
      // send_limit/unknown은 인프라·레이트리밋 문제이지 오답 시도가 아니다 — 환불한다.
      // code_mismatch/code_expired만 진짜 오답 시도이므로 예약 행을 그대로 남겨둔다.
      if (reason !== "code_mismatch" && reason !== "code_expired" && reservedId) {
        await db.delete(authAttempts).where(eq(authAttempts.id, reservedId));
      }
      return errorResponse(reason.toUpperCase(), otpFailureMessage(reason), 400);
    }

    // 성공 — 이번 예약 행을 포함해 실패 기록을 모두 정리한다.
    await db
      .delete(authAttempts)
      .where(and(eq(authAttempts.ip, key), eq(authAttempts.action, "otp_fail_target")));

    // 프로필 유무로 신규 여부를 판단한다. 온보딩을 중단했던 사용자도 신규로 취급해
    // 다시 온보딩을 마치게 한다 (/mypage가 이미 같은 기준으로 동작한다).
    const [profile] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, data.user.id))
      .limit(1);

    return successResponse({ isNewUser: !profile });
  } catch (err) {
    console.error("[auth/phone/verify]", err);
    // 예약 행이 남아 있다면(위 로직에 도달하지 못한 인프라 예외) 환불을 시도한다 —
    // 진짜 오답 판정 없이 한도를 소모하면 안 된다. 환불 자체가 실패해도 500 응답은
    // 이미 확정이므로 로그만 남긴다.
    if (reservedId) {
      try {
        await db.delete(authAttempts).where(eq(authAttempts.id, reservedId));
      } catch (cleanupErr) {
        console.error("[auth/phone/verify] cleanup failed", cleanupErr);
      }
    }
    return serverError();
  }
}
