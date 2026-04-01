import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { jobsTable } from "./jobs";
import { crewMembersTable } from "./crew";

export const jobFormsTable = pgTable("job_forms", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobsTable.id, { onDelete: "cascade" }),
  formType: text("form_type").notNull(),
  status: text("status").notNull().default("draft"),
  fields: text("fields"),
  customFormName: text("custom_form_name"),
  customFormData: text("custom_form_data"),
  signatureName: text("signature_name"),
  signatureData: text("signature_data"),
  signedByCrewId: integer("signed_by_crew_id").references(() => crewMembersTable.id, { onDelete: "set null" }),
  signedAt: timestamp("signed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertJobFormSchema = createInsertSchema(jobFormsTable).omit({
  id: true,
  createdAt: true,
  signedAt: true,
  status: true,
});

export type InsertJobForm = z.infer<typeof insertJobFormSchema>;
export type JobForm = typeof jobFormsTable.$inferSelect;
