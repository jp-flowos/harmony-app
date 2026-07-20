// 계정 플로우 공용 순수 유틸 — 서버 라우트와 클라이언트 폼이 함께 사용

// /terms, /privacy 문서 버전. 약관 개정 시 이 값을 올리고 재동의 플로우를 검토한다.
export const CONSENT_VERSION = "2026-07-17";

export function normalizePhone(input: string): string {
  return input.replace(/\D/g, "");
}

// GoTrue는 이메일을 소문자로 저장하지만 앞뒤 공백은 정규화하지 않는다 —
// 모바일 키보드 자동완성이 붙이는 공백 하나로 정상 계정의 로그인이 실패한다.
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidPhone(normalized: string): boolean {
  return /^010\d{7,8}$/.test(normalized);
}

// 시니어 친화 자동 하이픈: 3-4-4 (11자리 기준), 초과분은 무시
export function formatPhoneInput(input: string): string {
  const digits = normalizePhone(input).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

// 계정 열거 방지용 마스킹: ab***@d***.com (스펙 §7.1)
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const dot = domain.indexOf(".");
  const maskedLocal = `${local.slice(0, Math.min(2, local.length))}***`;
  const maskedDomain =
    dot < 0 ? `${domain.slice(0, 1)}***` : `${domain.slice(0, 1)}***${domain.slice(dot)}`;
  return `${maskedLocal}@${maskedDomain}`;
}
