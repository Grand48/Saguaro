import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { crewMembersTable } from "./crew";

export const timeOffRequestsTable = pgTable("time_off_requests", {
  id: serial("id").primaryKey(),
  crewId: integer("crew_id").notNull().references(() => crewMembersTable.id, { onDelete: "cascade" }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTimeOffSchema = createInsertSchema(timeOffRequestsTable).omit({ id: true, createdAt: true });
export type InsertTimeOff = z.infer<typeof insertTimeOffSchema>;
export type TimeOffRequest = typeof timeOffRequestsTable.$inferSelect;
