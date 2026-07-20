// 계정 플로우 공용 순수 유틸 — 서버 라우트와 클라이언트 폼이 함께 사용

// /terms, /privacy 문서 버전. 약관 개정 시 이 값을 올리고 재동의 플로우를 검토한다.
export const CONSENT_VERSION = "2026-07-17";

export function normalizePhone(input: string): string {
  return input.replace(/\D/g, "");
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

// 국내 010 번호 ↔ E.164. auth.users.phone과 h_profiles.phone은 모두 E.164로 저장한다.
// 형식이 두 개면 조회가 어긋나는 버그가 생긴다.
export function toE164KR(input: string): string | null {
  const trimmed = input.trim();
  const digits = trimmed.startsWith("+82")
    ? `0${normalizePhone(trimmed).slice(2)}`
    : normalizePhone(trimmed);
  if (!isValidPhone(digits)) return null;
  return `+82${digits.slice(1)}`;
}

export function formatPhoneDisplay(e164: string): string {
  if (!e164.startsWith("+82")) return e164;
  const digits = `0${normalizePhone(e164).slice(2)}`;
  if (!isValidPhone(digits)) return e164;
  // 완성된 번호이므로 자릿수를 알 수 있다 — 11자리는 3-4-4, 10자리는 3-3-4.
  // formatPhoneInput은 입력 중 최종 길이를 알 수 없어 항상 3-4-4를 쓰므로 재사용하지 않는다.
  const mid = digits.length === 11 ? 4 : 3;
  return `${digits.slice(0, 3)}-${digits.slice(3, 3 + mid)}-${digits.slice(3 + mid)}`;
}
