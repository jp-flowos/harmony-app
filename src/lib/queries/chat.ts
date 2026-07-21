import "server-only";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { blocks, chatRoomMembers, chatRooms, clubs } from "@/db/schema";

export type ChatRoomSummary = {
  id: string;
  name: string;
  type: "club" | "private" | "open";
  lastMessage: string;
  lastMessageAt: Date | null;
  unread: boolean;
};

// 내가 속한 채팅방 목록 — 최근 메시지순. 1:1 방은 상대 닉네임을 이름으로,
// 차단 관계인 상대의 1:1 방은 제외한다.
export async function getMyChatRooms(userId: string): Promise<ChatRoomSummary[]> {
  const rooms = await db
    .select({
      id: chatRooms.id,
      type: chatRooms.type,
      name: chatRooms.name,
      clubName: clubs.name,
      lastMessageAt: chatRooms.lastMessageAt,
      lastReadAt: chatRoomMembers.lastReadAt,
      otherUserId: sql<string | null>`(
        select m.user_id from si_mvp.h_chat_room_members m
        where m.room_id = ${chatRooms.id} and m.user_id <> ${userId} limit 1
      )`,
      otherNickname: sql<string | null>`(
        select p.nickname from si_mvp.h_chat_room_members m
        join si_mvp.h_profiles p on p.id = m.user_id
        where m.room_id = ${chatRooms.id} and m.user_id <> ${userId} limit 1
      )`,
    })
    .from(chatRoomMembers)
    .innerJoin(chatRooms, eq(chatRoomMembers.roomId, chatRooms.id))
    .leftJoin(clubs, eq(chatRooms.clubId, clubs.id))
    .where(eq(chatRoomMembers.userId, userId))
    .orderBy(sql`${chatRooms.lastMessageAt} desc nulls last`);

  if (rooms.length === 0) return [];

  // 차단 관계인 상대의 1:1 방 제외
  const privateOthers = rooms
    .filter((r) => r.type !== "club" && r.otherUserId)
    .map((r) => r.otherUserId as string);
  const blocked = new Set<string>();
  if (privateOthers.length > 0) {
    const blockRows = await db
      .select({ blockerId: blocks.blockerId, blockedId: blocks.blockedId })
      .from(blocks)
      .where(
        or(
          and(eq(blocks.blockerId, userId), inArray(blocks.blockedId, privateOthers)),
          and(eq(blocks.blockedId, userId), inArray(blocks.blockerId, privateOthers))
        )
      );
    for (const b of blockRows) {
      blocked.add(b.blockerId === userId ? b.blockedId : b.blockerId);
    }
  }
  const visible = rooms.filter((r) => !(r.otherUserId && blocked.has(r.otherUserId)));
  if (visible.length === 0) return [];

  // 방별 최신 메시지 미리보기 + 발신자 (윈도우 함수로 한 번에)
  const ids = visible.map((r) => r.id);
  const previews = await db.execute(sql`
    select room_id, content, sender_id
    from (
      select room_id, content, sender_id,
             row_number() over (partition by room_id order by created_at desc) as rn
      from si_mvp.h_chat_messages
      where is_deleted = false
        and room_id in (${sql.join(
          ids.map((id) => sql`${id}`),
          sql`, `
        )})
    ) ranked
    where rn = 1
  `);
  const previewByRoom = new Map<string, string>();
  const lastSenderByRoom = new Map<string, string>();
  for (const row of previews as unknown as {
    room_id: string;
    content: string;
    sender_id: string;
  }[]) {
    previewByRoom.set(row.room_id, row.content);
    lastSenderByRoom.set(row.room_id, row.sender_id);
  }

  return visible.map((r) => ({
    id: r.id,
    name: r.name ?? r.clubName ?? r.otherNickname ?? "채팅방",
    type: r.type,
    lastMessage: previewByRoom.get(r.id) ?? "",
    lastMessageAt: r.lastMessageAt ?? null,
    // 마지막 메시지가 내 것이면 안읽음으로 보지 않는다
    unread: Boolean(
      r.lastMessageAt &&
        (!r.lastReadAt || r.lastMessageAt > r.lastReadAt) &&
        lastSenderByRoom.get(r.id) !== userId
    ),
  }));
}
