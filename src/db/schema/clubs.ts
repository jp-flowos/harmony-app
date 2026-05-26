import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { places } from "./places";
import { profiles } from "./users";

export const joinTypeEnum = pgEnum("h_join_type", ["open", "approval"]);
export const memberRoleEnum = pgEnum("h_member_role", ["owner", "admin", "member"]);
export const memberStatusEnum = pgEnum("h_member_status", ["active", "banned"]);
export const postTypeEnum = pgEnum("h_post_type", ["general", "notice", "review", "photo"]);
export const meetingParticipantStatusEnum = pgEnum("h_meeting_participant_status", [
  "joined",
  "cancelled",
]);

export const clubs = pgTable("h_clubs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // hobby category
  region: text("region").notNull(),
  description: text("description").notNull(),
  ownerId: text("owner_id").references(() => profiles.id),
  coverImage: text("cover_image"),
  joinType: joinTypeEnum("join_type").default("open"),
  memberCount: integer("member_count").default(0),
  isPremium: boolean("is_premium").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clubMembers = pgTable(
  "h_club_members",
  {
    clubId: text("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").default("member"),
    joinedAt: timestamp("joined_at").defaultNow(),
    status: memberStatusEnum("status").default("active"),
  },
  (t) => [primaryKey({ columns: [t.clubId, t.userId] })]
);

export const clubPosts = pgTable("h_club_posts", {
  id: text("id").primaryKey(),
  clubId: text("club_id").references(() => clubs.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => profiles.id),
  type: postTypeEnum("type").default("general"),
  content: text("content").notNull(),
  imageUrls: jsonb("image_urls").$type<string[]>().default([]),
  likeCount: integer("like_count").default(0),
  commentCount: integer("comment_count").default(0),
  isHidden: boolean("is_hidden").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const clubPostLikes = pgTable(
  "h_club_post_likes",
  {
    postId: text("post_id")
      .notNull()
      .references(() => clubPosts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.userId] })]
);

export const clubComments = pgTable("h_club_comments", {
  id: text("id").primaryKey(),
  postId: text("post_id").references(() => clubPosts.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => profiles.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clubMeetings = pgTable("h_club_meetings", {
  id: text("id").primaryKey(),
  clubId: text("club_id").references(() => clubs.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  date: timestamp("date").notNull(),
  location: text("location").notNull(),
  locationLat: text("location_lat"),
  locationLng: text("location_lng"),
  placeId: text("place_id").references(() => places.id), // 카카오맵 연동
  maxParticipants: integer("max_participants").default(20),
  currentCount: integer("current_count").default(0),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const meetingParticipants = pgTable(
  "h_meeting_participants",
  {
    meetingId: text("meeting_id")
      .notNull()
      .references(() => clubMeetings.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: meetingParticipantStatusEnum("status").default("joined"),
    joinedAt: timestamp("joined_at").defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.meetingId, t.userId] })]
);
