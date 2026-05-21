import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { profiles } from "./users";

export const reportTargetTypeEnum = pgEnum("h_report_target_type", [
  "user",
  "post",
  "comment",
  "chat",
]);
export const reportStatusEnum = pgEnum("h_report_status", ["pending", "processed"]);
export const subscriptionTierEnum2 = pgEnum("h_sub_tier", ["free", "premium"]);

export const reports = pgTable("h_reports", {
  id: text("id").primaryKey(),
  reporterId: text("reporter_id").references(() => profiles.id),
  targetType: reportTargetTypeEnum("target_type").notNull(),
  targetId: text("target_id").notNull(),
  reason: text("reason").notNull(),
  status: reportStatusEnum("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const blocks = pgTable("h_blocks", {
  blockerId: text("blocker_id").references(() => profiles.id, { onDelete: "cascade" }),
  blockedId: text("blocked_id").references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscriptions = pgTable("h_subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => profiles.id, { onDelete: "cascade" }),
  tier: text("tier").default("premium"),
  amount: text("amount"),
  startedAt: timestamp("started_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  autoRenew: text("auto_renew").default("true"),
  paymentKey: text("payment_key"), // 토스페이먼츠
});
