import { Router } from "express";
import { db, timeEntriesTable, crewMembersTable, jobsTable } from "@workspace/db";
import { eq, desc, isNull, and, gte, lte } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// ── Helpers ────────────────────────────────────────────────────────────────────

async function enrichEntry(entry: any) {
  const crew = await db.select().from(crewMembersTable).where(eq(crewMembersTable.id, entry.crewId)).limit(1);
  const job = entry.jobId ? await db.select().from(jobsTable).where(eq(jobsTable.id, entry.jobId)).limit(1) : [];
  return {
    ...entry,
    crewName: crew[0]?.name ?? null,
    crewRole: crew[0]?.role ?? null,
    jobTitle: job[0]?.title ?? null,
  };
}

// ── Clock in ───────────────────────────────────────────────────────────────────

router.post("/time-entries/clock-in", async (req, res) => {
  try {
    const { crewId, jobId, notes } = z.object({
      crewId: z.number(),
      jobId: z.number().optional(),
      notes: z.string().optional(),
    }).parse(req.body);

    // Check already clocked in
    const active = await db.select().from(timeEntriesTable)
      .where(and(eq(timeEntriesTable.crewId, crewId), isNull(timeEntriesTable.clockOut)))
      .limit(1);
    if (active.length > 0) {
      return res.status(409).json({ error: "Already clocked in", entry: await enrichEntry(active[0]) });
    }

    const [entry] = await db.insert(timeEntriesTable).values({
      crewId,
      jobId: jobId ?? null,
      clockIn: new Date(),
      notes: notes ?? null,
    }).returning();

    res.status(201).json(await enrichEntry(entry));
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid input" });
  }
});

// ── Clock out ──────────────────────────────────────────────────────────────────

router.post("/time-entries/clock-out", async (req, res) => {
  try {
    const { crewId, notes } = z.object({
      crewId: z.number(),
      notes: z.string().optional(),
    }).parse(req.body);

    const active = await db.select().from(timeEntriesTable)
      .where(and(eq(timeEntriesTable.crewId, crewId), isNull(timeEntriesTable.clockOut)))
      .limit(1);

    if (active.length === 0) {
      return res.status(404).json({ error: "No active clock-in found" });
    }

    const [updated] = await db.update(timeEntriesTable)
      .set({ clockOut: new Date(), notes: notes ?? active[0].notes })
      .where(eq(timeEntriesTable.id, active[0].id))
      .returning();

    res.json(await enrichEntry(updated));
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid input" });
  }
});

// ── Active session for a crew member ──────────────────────────────────────────

router.get("/time-entries/crew/:crewId/active", async (req, res) => {
  try {
    const crewId = parseInt(req.params.crewId);
    const active = await db.select().from(timeEntriesTable)
      .where(and(eq(timeEntriesTable.crewId, crewId), isNull(timeEntriesTable.clockOut)))
      .limit(1);

    if (active.length === 0) return res.json(null);
    res.json(await enrichEntry(active[0]));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get active session" });
  }
});

// ── Entries for a crew member ──────────────────────────────────────────────────

router.get("/time-entries/crew/:crewId", async (req, res) => {
  try {
    const crewId = parseInt(req.params.crewId);
    const entries = await db.select().from(timeEntriesTable)
      .where(eq(timeEntriesTable.crewId, crewId))
      .orderBy(desc(timeEntriesTable.clockIn))
      .limit(50);

    const enriched = await Promise.all(entries.map(enrichEntry));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list entries" });
  }
});

// ── All entries (admin) ────────────────────────────────────────────────────────

router.get("/time-entries", async (req, res) => {
  try {
    const entries = await db.select().from(timeEntriesTable)
      .orderBy(desc(timeEntriesTable.clockIn))
      .limit(200);

    const enriched = await Promise.all(entries.map(enrichEntry));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list entries" });
  }
});

// ── All currently clocked-in crew ─────────────────────────────────────────────

router.get("/time-entries/active", async (req, res) => {
  try {
    const active = await db.select().from(timeEntriesTable)
      .where(isNull(timeEntriesTable.clockOut))
      .orderBy(timeEntriesTable.clockIn);

    const enriched = await Promise.all(active.map(enrichEntry));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get active sessions" });
  }
});

// ── Delete an entry ────────────────────────────────────────────────────────────

router.delete("/time-entries/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(timeEntriesTable).where(eq(timeEntriesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

export default router;
