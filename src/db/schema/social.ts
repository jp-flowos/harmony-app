import { pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { profiles } from "./users";

export const activityTypeEnum = pgEnum("h_activity_type", [
  "join_club",
  "create_meeting",
  "join_meeting",
  "write_post",
  "write_review",
  "write_comment",
]);

export const userFollows = pgTable("h_user_follows", {
  followerId: text("follower_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .notNull(),
  followingId: text("following_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activityFeed = pgTable("h_activity_feed", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .notNull(),
  type: activityTypeEnum("type").notNull(),
  targetId: text("target_id").notNull(), // club/meeting/post ID
  targetTitle: text("target_title"),
  metadata: text("metadata"), // JSON string for extra data
  createdAt: timestamp("created_at").defaultNow(),
});
