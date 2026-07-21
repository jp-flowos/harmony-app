import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { chatRoomMembers, chatRooms, clubs } from "@/db/schema";

export type ChatRoomSummary = {
  id: string;
  name: string;
  type: "club" | "private" | "open";
  lastMessage: string;
  lastMessageAt: Date | null;
  unread: boolean;
};

// 내가 속한 채팅방 목록 — 최근 메시지순. 채팅은 아직 방 생성이 연동되지 않아
// 현재는 빈 배열을 반환하지만, 방이 생기면 그대로 실데이터를 노출한다(하드코딩 샘플 제거).
export async function getMyChatRooms(userId: string): Promise<ChatRoomSummary[]> {
  const rooms = await db
    .select({
      id: chatRooms.id,
      type: chatRooms.type,
      name: chatRooms.name,
      clubName: clubs.name,
      lastMessageAt: chatRooms.lastMessageAt,
      lastReadAt: chatRoomMembers.lastReadAt,
    })
    .from(chatRoomMembers)
    .innerJoin(chatRooms, eq(chatRoomMembers.roomId, chatRooms.id))
    .leftJoin(clubs, eq(chatRooms.clubId, clubs.id))
    .where(eq(chatRoomMembers.userId, userId))
    // 메시지가 아직 없는 방(lastMessageAt=null)은 맨 아래로
    .orderBy(sql`${chatRooms.lastMessageAt} desc nulls last`);

  if (rooms.length === 0) return [];

  // 방별 최신 메시지 미리보기 + 발신자 (윈도우 함수로 한 번에)
  const ids = rooms.map((r) => r.id);
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

  return rooms.map((r) => ({
    id: r.id,
    name: r.name ?? r.clubName ?? "채팅방",
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
