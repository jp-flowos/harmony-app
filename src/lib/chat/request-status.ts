// 요청이 수락/거절 가능한 상태인지 — 목록 필터와 수락 라우트 가드가 공유.
export function isChatRequestActionable(
  status: string | null,
  expiresAt: Date | null,
  now: Date
): boolean {
  return status === "pending" && (expiresAt === null || expiresAt > now);
}
