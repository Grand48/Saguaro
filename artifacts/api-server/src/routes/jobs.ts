import { Router, type IRouter } from "express";
import { db, jobsTable, jobCrewTable, crewMembersTable, tasksTable, insertJobSchema } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

router.get("/jobs", async (req, res) => {
  try {
    const jobs = await db.select().from(jobsTable).orderBy(jobsTable.startDate);
    res.json(jobs);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list jobs" });
  }
});

router.post("/jobs", async (req, res) => {
  try {
    const input = insertJobSchema.parse(req.body);
    const [job] = await db.insert(jobsTable).values(input).returning();
    res.status(201).json(job);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid input" });
  }
});

router.get("/jobs/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
    if (!job) return res.status(404).json({ error: "Job not found" });

    // Get assigned crew
    const crewRows = await db
      .select({ crew: crewMembersTable })
      .from(jobCrewTable)
      .innerJoin(crewMembersTable, eq(jobCrewTable.crewId, crewMembersTable.id))
      .where(eq(jobCrewTable.jobId, id));
    const crew = crewRows.map((r) => r.crew);

    // Get tasks with assigned crew
    const taskRows = await db
      .select({ task: tasksTable, assignedTo: crewMembersTable })
      .from(tasksTable)
      .leftJoin(crewMembersTable, eq(tasksTable.assignedToId, crewMembersTable.id))
      .where(eq(tasksTable.jobId, id))
      .orderBy(tasksTable.createdAt);
    const tasks = taskRows.map((r) => ({ ...r.task, assignedTo: r.assignedTo ?? null }));

    res.json({ ...job, crew, tasks });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get job" });
  }
});

router.put("/jobs/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const input = insertJobSchema.parse(req.body);
    const [job] = await db.update(jobsTable).set(input).where(eq(jobsTable.id, id)).returning();
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid input" });
  }
});

router.delete("/jobs/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(jobsTable).where(eq(jobsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete job" });
  }
});

// Crew assignment
router.get("/jobs/:id/crew", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await db
      .select({ crew: crewMembersTable })
      .from(jobCrewTable)
      .innerJoin(crewMembersTable, eq(jobCrewTable.crewId, crewMembersTable.id))
      .where(eq(jobCrewTable.jobId, id));
    res.json(rows.map((r) => r.crew));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get job crew" });
  }
});

router.post("/jobs/:id/crew", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { crewIds } = z.object({ crewIds: z.array(z.number()) }).parse(req.body);

    // Remove existing assignments
    await db.delete(jobCrewTable).where(eq(jobCrewTable.jobId, id));

    // Add new assignments
    if (crewIds.length > 0) {
      await db.insert(jobCrewTable).values(crewIds.map((crewId) => ({ jobId: id, crewId })));
    }

    const rows = await db
      .select({ crew: crewMembersTable })
      .from(jobCrewTable)
      .innerJoin(crewMembersTable, eq(jobCrewTable.crewId, crewMembersTable.id))
      .where(eq(jobCrewTable.jobId, id));
    res.json(rows.map((r) => r.crew));
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid input" });
  }
});

router.delete("/jobs/:id/crew/:crewId", async (req, res) => {
  try {
    const jobId = Number(req.params.id);
    const crewId = Number(req.params.crewId);
    await db.delete(jobCrewTable).where(and(eq(jobCrewTable.jobId, jobId), eq(jobCrewTable.crewId, crewId)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to remove crew from job" });
  }
});

export default router;
