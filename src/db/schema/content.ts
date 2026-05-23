import { integer, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { profiles } from "./users";

export const infoCategoryEnum = pgEnum("h_info_category", [
  "health",
  "finance",
  "travel",
  "hobby",
  "gov",
]);

export const communityCategoryEnum = pgEnum("h_community_category", [
  "free",
  "health",
  "travel",
  "hobby",
  "daily",
  "review",
]);

// 운세
export const fortuneMaster = pgTable("h_fortune_master", {
  id: text("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD
  zodiac: text("zodiac").notNull(), // 쥐/소/호랑이/...
  content: text("content").notNull(),
  healthContent: text("health_content"),
  moneyContent: text("money_content"),
  relationContent: text("relation_content"),
});

export const fortuneComments = pgTable("h_fortune_comments", {
  id: text("id").primaryKey(),
  fortuneId: text("fortune_id").references(() => fortuneMaster.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => profiles.id),
  comment: text("comment").notNull(),
  region: text("region"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 정보 콘텐츠
export const infoContents = pgTable("h_info_contents", {
  id: text("id").primaryKey(),
  category: infoCategoryEnum("category").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  summaryBox: text("summary_box"),
  tags: jsonb("tags").$type<string[]>().default([]),
  author: text("author"),
  viewCount: integer("view_count").default(0),
  likeCount: integer("like_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const infoComments = pgTable("h_info_comments", {
  id: text("id").primaryKey(),
  contentId: text("content_id").references(() => infoContents.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => profiles.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 커뮤니티
export const communityPosts = pgTable("h_community_posts", {
  id: text("id").primaryKey(),
  category: communityCategoryEnum("category").notNull(),
  userId: text("user_id").references(() => profiles.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  imageUrls: jsonb("image_urls").$type<string[]>().default([]),
  tags: jsonb("tags").$type<string[]>().default([]),
  likeCount: integer("like_count").default(0),
  commentCount: integer("comment_count").default(0),
  region: text("region"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const communityLikes = pgTable("h_community_likes", {
  postId: text("post_id").references(() => communityPosts.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const communityComments = pgTable("h_community_comments", {
  id: text("id").primaryKey(),
  postId: text("post_id").references(() => communityPosts.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => profiles.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
