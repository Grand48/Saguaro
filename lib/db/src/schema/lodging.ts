import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const lodgingBookingsTable = pgTable("lodging_bookings", {
  id: serial("id").primaryKey(),
  room: text("room").notNull(),
  guestName: text("guest_name").notNull(),
  checkIn: text("check_in").notNull(),
  checkOut: text("check_out").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLodgingBookingSchema = createInsertSchema(lodgingBookingsTable).omit({ id: true, createdAt: true });
export type InsertLodgingBooking = z.infer<typeof insertLodgingBookingSchema>;
export type LodgingBooking = typeof lodgingBookingsTable.$inferSelect;
