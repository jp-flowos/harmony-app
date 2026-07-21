import { and, eq, sql } from "drizzle-orm";
import type { db } from "@/db";
import { chatRoomMembers, chatRooms } from "@/db/schema";

// db.transaction 콜백이 받는 tx 핸들 타입. 모든 헬퍼는 트랜잭션 내부에서 호출된다.
export type ChatTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// 클럽방이 없으면 생성하고 방 id를 돌려준다. club_id 부분 유니크로 idempotent.
export async function ensureClubRoom(
  tx: ChatTx,
  clubId: string,
  name: string
): Promise<string> {
  await tx
    .insert(chatRooms)
    .values({ id: crypto.randomUUID(), type: "club", name, clubId })
    .onConflictDoNothing();
  const [room] = await tx
    .select({ id: chatRooms.id })
    .from(chatRooms)
    .where(and(eq(chatRooms.clubId, clubId), eq(chatRooms.type, "club")))
    .limit(1);
  return room.id;
}

export async function addRoomMember(
  tx: ChatTx,
  roomId: string,
  userId: string
): Promise<void> {
  await tx.insert(chatRoomMembers).values({ roomId, userId }).onConflictDoNothing();
}

export async function removeRoomMember(
  tx: ChatTx,
  roomId: string,
  userId: string
): Promise<void> {
  await tx
    .delete(chatRoomMembers)
    .where(and(eq(chatRoomMembers.roomId, roomId), eq(chatRoomMembers.userId, userId)));
}

// 두 사람이 정확히 멤버인 기존 private 방을 재사용, 없으면 생성.
export async function findOrCreatePrivateRoom(
  tx: ChatTx,
  userA: string,
  userB: string
): Promise<string> {
  const existing = (await tx.execute(sql`
    select r.id
    from si_mvp.h_chat_rooms r
    join si_mvp.h_chat_room_members m1 on m1.room_id = r.id and m1.user_id = ${userA}
    join si_mvp.h_chat_room_members m2 on m2.room_id = r.id and m2.user_id = ${userB}
    where r.type = 'private'
      and (select count(*) from si_mvp.h_chat_room_members m where m.room_id = r.id) = 2
    limit 1
  `)) as unknown as { id: string }[];
  if (existing[0]?.id) return existing[0].id;

  const roomId = crypto.randomUUID();
  await tx.insert(chatRooms).values({ id: roomId, type: "private" });
  await tx
    .insert(chatRoomMembers)
    .values([
      { roomId, userId: userA },
      { roomId, userId: userB },
    ])
    .onConflictDoNothing();
  return roomId;
}
