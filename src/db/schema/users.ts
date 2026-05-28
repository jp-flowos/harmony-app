import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const subscriptionTierEnum = pgEnum("h_subscription_tier", ["free", "premium"]);
export const verificationTypeEnum = pgEnum("h_verification_type", [
  "real_name",
  "face",
  "activity",
  "review",
  "first_meeting",
]);

export const profiles = pgTable("h_profiles", {
  id: text("id").primaryKey(), // Supabase auth user id
  nickname: text("nickname").notNull(),
  birthYear: integer("birth_year"),
  region: text("region"),
  sido: text("sido"),
  sigungu: text("sigungu"),
  fontScale: text("font_scale").notNull().default("lg"),
  prefersVoiceGuide: boolean("prefers_voice_guide").notNull().default(false),
  kakaoShareDoneAt: timestamp("kakao_share_done_at"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  photoUrls: jsonb("photo_urls").$type<string[]>().default([]),
  isVerified: boolean("is_verified").default(false),
  subscriptionTier: subscriptionTierEnum("subscription_tier").default("free"),
  activityScore: integer("activity_score").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const hobbies = pgTable("h_hobbies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  icon: text("icon"),
});

export const userHobbies = pgTable(
  "h_user_hobbies",
  {
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    hobbyId: text("hobby_id")
      .notNull()
      .references(() => hobbies.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.hobbyId] })]
);

export const verificationBadges = pgTable(
  "h_verification_badges",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => profiles.id, { onDelete: "cascade" }),
    type: verificationTypeEnum("type").notNull(),
    verifiedAt: timestamp("verified_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("h_verification_badges_user_type_unique")
      .on(t.userId, t.type)
      .where(sql`${t.userId} is not null`),
  ]
);

export const pushSubscriptions = pgTable("h_push_subscriptions", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
