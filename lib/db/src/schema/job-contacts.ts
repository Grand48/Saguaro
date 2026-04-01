import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { jobsTable } from "./jobs";

export const jobContactsTable = pgTable("job_contacts", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").notNull(),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertJobContactSchema = createInsertSchema(jobContactsTable).omit({ id: true, createdAt: true });
export const updateJobContactSchema = createUpdateSchema(jobContactsTable).omit({ id: true, jobId: true, createdAt: true });
export type InsertJobContact = z.infer<typeof insertJobContactSchema>;
export type JobContact = typeof jobContactsTable.$inferSelect;
