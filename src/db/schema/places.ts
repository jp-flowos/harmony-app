import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { profiles } from "./users";

export const placeCategoryEnum = [
  "cafe",
  "park",
  "golf",
  "culture",
  "hospital",
  "restaurant",
  "user",
] as const;

export const places = pgTable("h_places", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  lat: text("lat").notNull(),
  lng: text("lng").notNull(),
  description: text("description"),
  isSeniorRecommended: boolean("is_senior_recommended").default(false),
  dataSource: text("data_source").default("kakao"), // kakao | user
  createdBy: text("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at").defaultNow(),
});
