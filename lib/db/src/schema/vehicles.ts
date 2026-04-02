import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vehiclesTable = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  vehicleNumber: text("vehicle_number").notNull(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: text("year"),
  licensePlate: text("license_plate").notNull(),
  assignedTo: text("assigned_to"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVehicleSchema = createInsertSchema(vehiclesTable).omit({ id: true, createdAt: true });
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehiclesTable.$inferSelect;

export const vehicleMaintenanceTable = pgTable("vehicle_maintenance", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("upcoming"),
  scheduledDate: text("scheduled_date"),
  completedDate: text("completed_date"),
  mileage: integer("mileage"),
  cost: text("cost"),
  performedBy: text("performed_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVehicleMaintenanceSchema = createInsertSchema(vehicleMaintenanceTable).omit({ id: true, createdAt: true });
export type InsertVehicleMaintenance = z.infer<typeof insertVehicleMaintenanceSchema>;
export type VehicleMaintenance = typeof vehicleMaintenanceTable.$inferSelect;
