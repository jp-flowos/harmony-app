import { pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { clubs } from "./clubs";
import { profiles } from "./users";

export const chatRoomTypeEnum = pgEnum("h_chat_room_type", ["club", "private", "open"]);
export const chatRequestStatusEnum = pgEnum("h_chat_request_status", [
  "pending",
  "accepted",
  "rejected",
  "expired",
]);

// Supabase: 메타데이터만 저장 (실제 메시지는 Firebase)
export const chatRooms = pgTable("h_chat_rooms", {
  id: text("id").primaryKey(),
  type: chatRoomTypeEnum("type").notNull(),
  name: text("name"),
  clubId: text("club_id").references(() => clubs.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  lastMessageAt: timestamp("last_message_at"),
  firebaseRoomId: text("firebase_room_id"), // Firebase 채팅방 ID 연결
});

export const chatRoomMembers = pgTable("h_chat_room_members", {
  roomId: text("room_id").references(() => chatRooms.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => profiles.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").defaultNow(),
  lastReadAt: timestamp("last_read_at"),
});

// 1:1 채팅 요청
export const chatRequests = pgTable("h_chat_requests", {
  id: text("id").primaryKey(),
  fromUser: text("from_user").references(() => profiles.id),
  toUser: text("to_user").references(() => profiles.id),
  status: chatRequestStatusEnum("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // 24시간 미응답 시 만료
});
