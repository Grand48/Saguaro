import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { crewMembersTable } from "./crew";
import { jobsTable } from "./jobs";

export const timeEntriesTable = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  crewId: integer("crew_id").notNull().references(() => crewMembersTable.id, { onDelete: "cascade" }),
  jobId: integer("job_id").references(() => jobsTable.id, { onDelete: "set null" }),
  clockIn: timestamp("clock_in").notNull().defaultNow(),
  clockOut: timestamp("clock_out"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTimeEntrySchema = createInsertSchema(timeEntriesTable).omit({ id: true, createdAt: true });
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntriesTable.$inferSelect;
