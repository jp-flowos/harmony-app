import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { profiles } from "./users";
import { clubMeetings } from "./clubs";

export const meetingReviews = pgTable("h_meeting_reviews", {
  id: text("id").primaryKey(),
  meetingId: text("meeting_id").references(() => clubMeetings.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => profiles.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1-5
  content: text("content").notNull(),
  imageUrls: jsonb("image_urls").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
