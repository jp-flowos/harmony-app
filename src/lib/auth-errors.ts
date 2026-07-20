// SMS 인증 실패 사유 → 시니어 사용자용 한국어 안내.
// Supabase가 돌려주는 영문 메시지를 그대로 노출하지 않기 위한 단일 매핑 지점.

export type OtpFailureReason =
  | "invalid_phone"
  | "send_limit"
  | "resend_wait"
  | "code_mismatch"
  | "code_expired"
  | "fail_limit"
  | "unknown";

const OTP_MESSAGES: Record<OtpFailureReason, string> = {
  invalid_phone: "휴대폰 번호를 다시 확인해주세요. 010으로 시작하는 번호만 가능해요.",
  send_limit: "오늘 받을 수 있는 횟수를 모두 사용했어요. 내일 다시 시도해주세요.",
  resend_wait: "잠시 후에 다시 받을 수 있어요.",
  code_mismatch: "인증번호가 맞지 않아요. 다시 확인해주세요.",
  code_expired: "인증번호 유효시간이 지났어요. 다시 받아주세요.",
  fail_limit: "여러 번 틀렸어요. 인증번호를 다시 받아주세요.",
  unknown: "잠시 후 다시 시도해주세요.",
};

export function otpFailureMessage(
  reason: OtpFailureReason,
  params?: { retryAfterSec?: number }
): string {
  if (reason === "resend_wait" && typeof params?.retryAfterSec === "number") {
    return `${params.retryAfterSec}초 후에 다시 받을 수 있어요.`;
  }
  return OTP_MESSAGES[reason];
}

// Supabase AuthError는 code가 없는 응답도 있어 message 폴백을 함께 본다.
export function classifyOtpError(error: {
  code?: string;
  status?: number;
  message?: string;
}): OtpFailureReason {
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();

  if (code === "otp_expired" || message.includes("expired")) return "code_expired";
  if (
    code === "over_sms_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    error.status === 429 ||
    message.includes("rate limit")
  ) {
    return "send_limit";
  }
  if (code === "otp_disabled" || message.includes("invalid token") || message.includes("invalid")) {
    return "code_mismatch";
  }
  return "unknown";
}

// Supabase AuthError는 code가 없는 구버전 응답도 있어 message 폴백을 함께 본다.
// 서버에서 getUser() 실패를 해석할 때 쓴다.
// true  = 토큰이 실제로 무효/만료 → 로그인 화면으로 보내는 게 맞다
// false = 네트워크·서버 장애 → 로그아웃으로 처리하면 안 되고 재시도 UI를 보여야 한다
export function isAuthRejection(error: { status?: number; code?: string } | null): boolean {
  if (!error) return false;
  const status = error.status ?? 0;
  return status === 400 || status === 401 || status === 403;
}
