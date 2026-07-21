import "server-only";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { chatRequests, profiles } from "@/db/schema";
import { getBlockRelation, isBlockedEitherWay } from "@/lib/blocks";

export { isChatRequestActionable } from "@/lib/chat/request-status";

export type ReceivedChatRequest = {
  requestId: string;
  fromUserId: string;
  nickname: string;
  avatarUrl: string | null;
  createdAt: Date | null;
};

// 내가 받은 pending·미만료 1:1 요청 목록(차단 관계 제외), 보낸 사람 프로필 포함.
export async function getReceivedChatRequests(userId: string): Promise<ReceivedChatRequest[]> {
  const now = new Date();
  const rows = await db
    .select({
      requestId: chatRequests.id,
      fromUserId: chatRequests.fromUser,
      nickname: profiles.nickname,
      avatarUrl: profiles.avatarUrl,
      createdAt: chatRequests.createdAt,
    })
    .from(chatRequests)
    .innerJoin(profiles, eq(profiles.id, chatRequests.fromUser))
    .where(
      and(
        eq(chatRequests.toUser, userId),
        eq(chatRequests.status, "pending"),
        or(isNull(chatRequests.expiresAt), gt(chatRequests.expiresAt, now))
      )
    );

  const result: ReceivedChatRequest[] = [];
  for (const r of rows) {
    if (!r.fromUserId) continue;
    const rel = await getBlockRelation(userId, r.fromUserId);
    if (isBlockedEitherWay(rel)) continue;
    result.push({
      requestId: r.requestId,
      fromUserId: r.fromUserId,
      nickname: r.nickname,
      avatarUrl: r.avatarUrl,
      createdAt: r.createdAt,
    });
  }
  return result;
}
