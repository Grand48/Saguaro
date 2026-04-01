import { Router, type IRouter } from "express";
import { db, lodgingBookingsTable, insertLodgingBookingSchema } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

router.get("/lodging", async (req, res) => {
  try {
    const { month } = req.query;
    let bookings;
    if (month && typeof month === "string") {
      const [year, mon] = month.split("-");
      const start = `${year}-${mon}-01`;
      const lastDay = new Date(Number(year), Number(mon), 0).getDate();
      const end = `${year}-${mon}-${String(lastDay).padStart(2, "0")}`;
      bookings = await db
        .select()
        .from(lodgingBookingsTable)
        .where(
          and(
            lte(lodgingBookingsTable.checkIn, end),
            gte(lodgingBookingsTable.checkOut, start)
          )
        )
        .orderBy(lodgingBookingsTable.checkIn);
    } else {
      bookings = await db.select().from(lodgingBookingsTable).orderBy(lodgingBookingsTable.checkIn);
    }
    res.json(bookings);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list lodging bookings" });
  }
});

router.post("/lodging", async (req, res) => {
  try {
    const input = insertLodgingBookingSchema.parse(req.body);
    const [booking] = await db.insert(lodgingBookingsTable).values(input).returning();
    res.status(201).json(booking);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid input" });
  }
});

router.put("/lodging/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updateSchema = z.object({
      room: z.string().optional(),
      guestName: z.string().optional(),
      checkIn: z.string().optional(),
      checkOut: z.string().optional(),
      notes: z.string().nullable().optional(),
    });
    const input = updateSchema.parse(req.body);
    const [booking] = await db
      .update(lodgingBookingsTable)
      .set(input)
      .where(eq(lodgingBookingsTable.id, id))
      .returning();
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    res.json(booking);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid input" });
  }
});

router.delete("/lodging/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(lodgingBookingsTable).where(eq(lodgingBookingsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete booking" });
  }
});

export default router;
