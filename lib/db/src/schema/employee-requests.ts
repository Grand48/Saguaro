import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { crewMembersTable } from "./crew";

export const employeeRequestsTable = pgTable("employee_requests", {
  id: serial("id").primaryKey(),
  crewId: integer("crew_id").notNull().references(() => crewMembersTable.id, { onDelete: "cascade" }),
  category: text("category").notNull().default("supply"),
  title: text("title").notNull(),
  description: text("description"),
  quantity: integer("quantity").notNull().default(1),
  priority: text("priority").notNull().default("normal"),
  status: text("status").notNull().default("pending"),
  fulfilledAt: timestamp("fulfilled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmployeeRequestSchema = createInsertSchema(employeeRequestsTable).omit({
  id: true,
  createdAt: true,
  fulfilledAt: true,
  status: true,
});

export type InsertEmployeeRequest = z.infer<typeof insertEmployeeRequestSchema>;
export type EmployeeRequest = typeof employeeRequestsTable.$inferSelect;
