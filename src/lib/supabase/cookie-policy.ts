// "로그인 상태 유지" 정책 — client/server/proxy 세 곳의 쿠키 어댑터가 공유 (스펙 §7.4)
export const KEEP_SIGNIN_COOKIE = "harmony-keep-signin";

// 값이 "0"일 때만 유지 해제 — auth 쿠키를 만료 없는 세션 쿠키로 강등
export function shouldPersist(value: string | undefined): boolean {
  return value !== "0";
}

export function stripPersistence<T extends { maxAge?: number; expires?: Date }>(options: T): T {
  const next = { ...options };
  delete next.maxAge;
  delete next.expires;
  return next;
}
