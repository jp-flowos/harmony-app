import "server-only";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { blocks } from "@/db/schema";

export interface BlockRelation {
  iBlocked: boolean; // 내가 상대를 차단함
  blockedByThem: boolean; // 상대가 나를 차단함
}

// 두 사용자 간 차단 관계를 양방향으로 한 번에 조회한다.
export async function getBlockRelation(viewerId: string, otherId: string): Promise<BlockRelation> {
  const rows = await db
    .select({ blockerId: blocks.blockerId })
    .from(blocks)
    .where(
      or(
        and(eq(blocks.blockerId, viewerId), eq(blocks.blockedId, otherId)),
        and(eq(blocks.blockerId, otherId), eq(blocks.blockedId, viewerId))
      )
    );

  let iBlocked = false;
  let blockedByThem = false;
  for (const r of rows) {
    if (r.blockerId === viewerId) iBlocked = true;
    if (r.blockerId === otherId) blockedByThem = true;
  }
  return { iBlocked, blockedByThem };
}

// 차단 관계가 어느 방향으로든 존재하는지 — 프로필/채팅 접근 제한 판정용.
export function isBlockedEitherWay(rel: BlockRelation): boolean {
  return rel.iBlocked || rel.blockedByThem;
}
