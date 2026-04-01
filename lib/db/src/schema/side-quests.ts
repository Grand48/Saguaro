import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { crewMembersTable } from "./crew";

export const sideQuestsTable = pgTable("side_quests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  adminLocked: boolean("admin_locked").notNull().default(true),
  claimedByCrewId: integer("claimed_by_crew_id").references(() => crewMembersTable.id, { onDelete: "set null" }),
  claimedAt: timestamp("claimed_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSideQuestSchema = createInsertSchema(sideQuestsTable).omit({
  id: true,
  createdAt: true,
  claimedAt: true,
  completedAt: true,
});

export type InsertSideQuest = z.infer<typeof insertSideQuestSchema>;
export type SideQuest = typeof sideQuestsTable.$inferSelect;
