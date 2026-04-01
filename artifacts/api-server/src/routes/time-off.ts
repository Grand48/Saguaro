import { Router } from "express";
import { db, timeOffRequestsTable, insertTimeOffSchema, crewMembersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

router.get("/time-off", async (req, res) => {
  try {
    const rows = await db
      .select({ request: timeOffRequestsTable, crew: crewMembersTable })
      .from(timeOffRequestsTable)
      .innerJoin(crewMembersTable, eq(timeOffRequestsTable.crewId, crewMembersTable.id))
      .orderBy(desc(timeOffRequestsTable.createdAt));
    res.json(rows.map((r) => ({ ...r.request, crew: r.crew })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list time-off requests" });
  }
});

router.get("/time-off/crew/:crewId", async (req, res) => {
  try {
    const crewId = parseInt(req.params.crewId);
    const rows = await db
      .select({ request: timeOffRequestsTable, crew: crewMembersTable })
      .from(timeOffRequestsTable)
      .innerJoin(crewMembersTable, eq(timeOffRequestsTable.crewId, crewMembersTable.id))
      .where(eq(timeOffRequestsTable.crewId, crewId))
      .orderBy(desc(timeOffRequestsTable.createdAt));
    res.json(rows.map((r) => ({ ...r.request, crew: r.crew })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list time-off requests" });
  }
});

router.post("/time-off", async (req, res) => {
  try {
    const body = {
      ...req.body,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
    };
    const parsed = insertTimeOffSchema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const [request] = await db.insert(timeOffRequestsTable).values(parsed.data).returning();
    res.status(201).json(request);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid input" });
  }
});

router.put("/time-off/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const schema = z.object({
      status: z.enum(["pending", "approved", "denied"]).optional(),
      adminNotes: z.string().optional().nullable(),
      reason: z.string().optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const [updated] = await db
      .update(timeOffRequestsTable)
      .set(parsed.data)
      .where(eq(timeOffRequestsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Failed to update request" });
  }
});

router.delete("/time-off/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(timeOffRequestsTable).where(eq(timeOffRequestsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete request" });
  }
});

export default router;
