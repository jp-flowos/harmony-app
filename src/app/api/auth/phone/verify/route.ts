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

// verifyOtp 실패를 "환불(=예약 행 삭제)"할지 판정한다.
//
// 원칙: 기본값은 "환불하지 않는다"(행을 남겨 5회 한도를 소모한다)이며, 인프라 실패로
// *확인된* 경우에만 예외적으로 환불한다. classifyOtpError가 문자열을 인식하지 못해
// "unknown"을 반환하는 것은 "인프라 실패로 확인됐다"는 뜻이 아니라 "무엇인지 모른다"는
// 뜻이다 — classifyOtpError는 Supabase가 돌려주는 영문 문구("expired", "invalid" 등)를
// substring으로 매칭해 오답을 인식하는데, 오늘 "Token has expired or is invalid"인
// 벤더 메시지가 내일 "Token not found"처럼 재작성되면 모든 오답 시도가 unknown으로
// 떨어진다. unknown을 환불 대상으로 취급하면 그 순간부터 5회 한도가 조용히 무제한
// 브루트포스로 열리며, 아무 테스트도 깨지지 않고 아무 로그도 남지 않는다.
// 그래서 환불 여부는 문자열 분류(classifyOtpError)가 아니라 HTTP status로만 판단한다:
// status를 신뢰할 수 있는 건 "Supabase가 토큰 자체를 평가하지 않았다"는 사실을
// status 코드가 직접 말해주기 때문이다(429=레이트리밋 거절, 5xx=서버 장애).
export function shouldRefundVerifyAttempt(error: { status?: number } | null): boolean {
  if (!error) return false; // 에러 없이 세션/유저가 비어있는 경우는 오답 시도로 취급 — 행을 남긴다
  if (error.status === 429) return true; // 레이트리밋으로 거절 — 토큰을 평가하지 않았다
  if (typeof error.status === "number" && error.status >= 500) return true; // 서버 장애 — 판정 없음
  return false; // 그 외(classifyOtpError가 unknown으로 분류하는 경우 포함)는 행을 남긴다
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
// 다만 이 행은 아직 "진짜 오답"인지 모르는 예약(reservation)이다. 원칙은 "인프라 실패로
// *확인된* 경우에만 환불하고, 그 외에는 전부 행을 남겨 5회 한도를 소모한다"이다 —
// 우리 쪽 fail_limit 게이트에 막힌 경우와 Supabase가 status 429/5xx로 응답한 경우
// (아래 shouldRefundVerifyAttempt 참고)만 환불한다. classifyOtpError가 문자열을
// 인식하지 못해 unknown을 반환하는 경우는 "인프라 실패 확인"이 아니므로 환불하지
// 않는다 — 자세한 이유는 shouldRefundVerifyAttempt 주석 참고.
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
      // 환불 여부는 classifyOtpError의 문자열 분류가 아니라 status 기반 판정 함수가
      // 결정한다 — 위 함수 주석 참고. code_mismatch/code_expired/unknown 등 대부분의
      // 사유는 행을 남겨 카운터를 소모하고, status 429/5xx로 확인된 인프라 실패만 환불한다.
      if (shouldRefundVerifyAttempt(error) && reservedId) {
        await db.delete(authAttempts).where(eq(authAttempts.id, reservedId));
      }

      if (reason === "send_limit") {
        // 이 라우트는 "코드 입력" 화면이다. send_limit 문구("오늘 받을 수 있는 횟수를
        // 모두 사용했어요...")는 발송(send) 화면 문맥이라 여기서 보여주면 사용자가
        // 지금 하고 있는 행동(코드 입력)과 맞지 않는다 — unknown 메시지로 대체한다.
        return errorResponse("SEND_LIMIT", otpFailureMessage("unknown"), 429);
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
