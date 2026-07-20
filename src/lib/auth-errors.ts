// 로그인 실패 사유 → 시니어 사용자용 한국어 안내 (스펙 §7.2)
// Supabase가 돌려주는 영문 메시지를 그대로 노출하지 않기 위한 단일 매핑 지점.

export type LoginFailureReason =
  | "invalid_credentials"
  | "oauth_only"
  | "email_not_confirmed"
  | "rate_limited"
  | "user_banned"
  | "unknown";

const MESSAGES: Record<LoginFailureReason, string> = {
  invalid_credentials: "이메일 또는 비밀번호가 일치하지 않아요. 다시 확인해주세요.",
  // 이메일 로그인 화면에는 카카오 버튼이 없다 — 위치를 가리키지 말고 이동 수단을 함께 렌더링한다
  oauth_only: "카카오로 가입하신 계정이에요. 카카오로 로그인해주세요.",
  email_not_confirmed: "이메일 확인이 아직 안 됐어요. 메일함에서 확인 메일을 열어주세요.",
  rate_limited: "로그인 시도가 너무 많아요. 잠시 후 다시 시도해주세요.",
  user_banned: "이용이 정지된 계정이에요. 고객센터로 문의해주세요.",
  unknown: "로그인에 실패했어요. 잠시 후 다시 시도해주세요.",
};

export function loginFailureMessage(reason: LoginFailureReason): string {
  return MESSAGES[reason];
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

export function classifyLoginError(error: {
  code?: string;
  status?: number;
  message?: string;
}): LoginFailureReason {
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();

  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return "email_not_confirmed";
  }
  if (code === "user_banned" || message.includes("user is banned")) return "user_banned";
  if (
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    error.status === 429 ||
    message.includes("rate limit")
  ) {
    return "rate_limited";
  }
  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return "invalid_credentials";
  }
  return "unknown";
}
