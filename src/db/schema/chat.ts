import {
  boolean,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { clubs } from "./clubs";
import { profiles } from "./users";

export const chatRoomTypeEnum = pgEnum("h_chat_room_type", ["club", "private", "open"]);
export const chatRequestStatusEnum = pgEnum("h_chat_request_status", [
  "pending",
  "accepted",
  "rejected",
  "expired",
]);

export const chatRooms = pgTable("h_chat_rooms", {
  id: text("id").primaryKey(),
  type: chatRoomTypeEnum("type").notNull(),
  name: text("name"),
  clubId: text("club_id").references(() => clubs.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  lastMessageAt: timestamp("last_message_at"),
});

export const chatRoomMembers = pgTable(
  "h_chat_room_members",
  {
    roomId: text("room_id")
      .notNull()
      .references(() => chatRooms.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at").defaultNow(),
    lastReadAt: timestamp("last_read_at"),
  },
  (t) => [primaryKey({ columns: [t.roomId, t.userId] })]
);

export const chatMessages = pgTable(
  "h_chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: text("room_id")
      .notNull()
      .references(() => chatRooms.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    senderNickname: text("sender_nickname").notNull(),
    content: text("content").notNull(),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("h_idx_chat_messages_room_created").on(t.roomId, t.createdAt)]
);

export const chatRequests = pgTable("h_chat_requests", {
  id: text("id").primaryKey(),
  fromUser: text("from_user").references(() => profiles.id),
  toUser: text("to_user").references(() => profiles.id),
  status: chatRequestStatusEnum("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});
