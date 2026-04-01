import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { crewMembersTable } from "./crew";

export const crewDocumentsTable = pgTable("crew_documents", {
  id: serial("id").primaryKey(),
  crewId: integer("crew_id").notNull().references(() => crewMembersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  docType: text("doc_type").notNull().default("other"),
  fileName: text("file_name").notNull(),
  fileMimeType: text("file_mime_type").notNull(),
  fileData: text("file_data").notNull(),
  expiryDate: timestamp("expiry_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCrewDocumentSchema = createInsertSchema(crewDocumentsTable).omit({ id: true, createdAt: true });
export type InsertCrewDocument = z.infer<typeof insertCrewDocumentSchema>;
export type CrewDocument = typeof crewDocumentsTable.$inferSelect;
