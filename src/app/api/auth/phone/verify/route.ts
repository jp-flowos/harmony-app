import { and, count, eq, gte, inArray } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { authAttempts, profiles } from "@/db/schema";
import { errorResponse, serverError, successResponse, validationError } from "@/lib/api-response";
import { classifyOtpError, otpFailureMessage } from "@/lib/auth-errors";
import { toE164KR } from "@/lib/auth-utils";
import { decideVerify, POLICY_WINDOW_MS } from "@/lib/otp-policy";
import { clientIp, phoneKey } from "@/lib/otp-rate-limit";
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
// 카운터는 두 축으로 예약한다 — 번호별(otp_fail_target, MAX_VERIFY_FAILS)과
// IP별(otp_verify_fail_ip, MAX_VERIFY_FAILS_PER_IP_PER_DAY). 번호별 한도만 있으면 한
// IP가 이미 발송된 여러 번호를 병렬로 브루트포스해도 번호마다 한도가 따로 소모돼
// 전체적으로는 무제한이 된다 — IP별 한도가 그 구멍을 막는다.
//
// 다만 이 행들은 아직 "진짜 오답"인지 모르는 예약(reservation)이다. 원칙은 "인프라
// 실패로 *확인된* 경우에만 환불하고, 그 외에는 전부 행을 남겨 한도를 소모한다"이다 —
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

  const ip = clientIp(request);
  const key = phoneKey(e164);
  let reservedIds: string[] = [];

  try {
    const since = new Date(Date.now() - POLICY_WINDOW_MS);

    // 카운트보다 먼저 예약 행 두 개(번호별 + IP별)를 insert — 동시 요청들이 서로의
    // 행을 카운트에서 보게 하기 위해서다. 판정에 막히거나 진짜 오답이 아닌 것으로
    // 밝혀지면 아래에서 두 행을 함께 환불한다.
    const inserted = await db
      .insert(authAttempts)
      .values([
        { ip: key, action: "otp_fail_target" },
        { ip, action: "otp_verify_fail_ip" },
      ])
      .returning({ id: authAttempts.id });
    reservedIds = inserted.map((row) => row.id);

    const [[failRow], [failIpRow]] = await Promise.all([
      db
        .select({ value: count() })
        .from(authAttempts)
        .where(
          and(
            eq(authAttempts.ip, key),
            eq(authAttempts.action, "otp_fail_target"),
            gte(authAttempts.createdAt, since)
          )
        ),
      db
        .select({ value: count() })
        .from(authAttempts)
        .where(
          and(
            eq(authAttempts.ip, ip),
            eq(authAttempts.action, "otp_verify_fail_ip"),
            gte(authAttempts.createdAt, since)
          )
        ),
    ]);
    // 방금 넣은 자기 자신의 예약 행이 각 카운트에 포함돼 있으므로 1씩 뺀다 (send 라우트와 동일 패턴).
    const recentFails = (failRow?.value ?? 0) - 1;
    const recentFailsForIp = (failIpRow?.value ?? 0) - 1;

    const gate = decideVerify({ recentFails, recentFailsForIp });
    if (!gate.allowed) {
      // 우리 쪽 레이트리밋 판정이지 사용자가 틀린 코드를 넣은 게 아니다 — 두 예약 행을 함께 환불한다.
      if (reservedIds.length > 0) {
        await db.delete(authAttempts).where(inArray(authAttempts.id, reservedIds));
      }
      return errorResponse("FAIL_LIMIT", otpFailureMessage("fail_limit"), 429);
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      phone: e164,
      token: parsed.data.code,
      type: "sms",
    });

    if (error) {
      // send/route.ts와 동일하게 실패를 반드시 로그로 남긴다 — SMS 공급자 롤아웃 중
      // 디버깅이 필요한 지점이다. 번호와 코드는 절대 로그에 남기지 않는다.
      console.error("[auth/phone/verify] verifyOtp failed", error.status, error.message);
    }

    if (error || !data.session || !data.user) {
      const reason = error ? classifyOtpError(error) : "code_mismatch";
      // 환불 여부는 classifyOtpError의 문자열 분류가 아니라 status 기반 판정 함수가
      // 결정한다 — 위 함수 주석 참고. code_mismatch/code_expired/unknown 등 대부분의
      // 사유는 행을 남겨 카운터를 소모하고, status 429/5xx로 확인된 인프라 실패만 환불한다.
      if (shouldRefundVerifyAttempt(error) && reservedIds.length > 0) {
        await db.delete(authAttempts).where(inArray(authAttempts.id, reservedIds));
      }

      if (reason === "send_limit") {
        // 이 라우트는 "코드 입력" 화면이다. send_limit 문구("오늘 받을 수 있는 횟수를
        // 모두 사용했어요...")는 발송(send) 화면 문맥이라 여기서 보여주면 사용자가
        // 지금 하고 있는 행동(코드 입력)과 맞지 않는다 — unknown 메시지로 대체한다.
        // 코드도 메시지에 맞춰 UNKNOWN으로 통일한다 — SEND_LIMIT 코드를 그대로 두면
        // 코드로 분기하는 클라이언트가 "오늘 발송 한도 초과" 문구를 렌더링해, 실제로
        // 내려주는 "잠시 후 다시 시도해주세요" 메시지와 어긋난다.
        return errorResponse("UNKNOWN", otpFailureMessage("unknown"), 429);
      }

      // Supabase 인프라 장애(5xx)는 사용자 입력 문제가 아니다. 400(클라이언트 오류)으로
      // 응답하면 서버 장애가 클라이언트 잘못으로 위장돼 알람이 울리지 않는다 — send
      // 라우트(SEND_FAILED, 502)와 동일하게 502로 알린다. 다만 진짜 오답/만료로 분류된
      // 경우는 status 값과 무관하게 항상 400을 유지한다.
      const isGenuineCodeError = reason === "code_mismatch" || reason === "code_expired";
      const isInfraFailure =
        !isGenuineCodeError && typeof error?.status === "number" && error.status >= 500;
      return errorResponse(
        reason.toUpperCase(),
        otpFailureMessage(reason),
        isInfraFailure ? 502 : 400
      );
    }

    // 성공 — 이번 예약 행을 포함해 번호별 실패 기록을 모두 정리한다.
    // IP별 카운터(otp_verify_fail_ip)는 일부러 지우지 않는다 — 이 카운터는 "이 IP가
    // 서로 다른 번호를 얼마나 브루트포스했는지"를 추적하는 값이라, 번호 하나가
    // 성공했다고 같은 IP에서 다른 번호들에 쌓인 실패 기록까지 초기화하면 안 된다.
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
    if (reservedIds.length > 0) {
      try {
        await db.delete(authAttempts).where(inArray(authAttempts.id, reservedIds));
      } catch (cleanupErr) {
        console.error("[auth/phone/verify] cleanup failed", cleanupErr);
      }
    }
    return serverError();
  }
}
