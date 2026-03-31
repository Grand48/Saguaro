import { Router, type IRouter } from "express";
import { db, tasksTable, crewMembersTable, insertTaskSchema } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

router.get("/jobs/:id/tasks", async (req, res) => {
  try {
    const jobId = Number(req.params.id);
    const rows = await db
      .select({ task: tasksTable, assignedTo: crewMembersTable })
      .from(tasksTable)
      .leftJoin(crewMembersTable, eq(tasksTable.assignedToId, crewMembersTable.id))
      .where(eq(tasksTable.jobId, jobId))
      .orderBy(tasksTable.createdAt);
    res.json(rows.map((r) => ({ ...r.task, assignedTo: r.assignedTo ?? null })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list tasks" });
  }
});

router.post("/jobs/:id/tasks", async (req, res) => {
  try {
    const jobId = Number(req.params.id);
    const input = insertTaskSchema.parse({ ...req.body, jobId });
    const [task] = await db.insert(tasksTable).values(input).returning();

    // Return with assignedTo
    const [result] = await db
      .select({ task: tasksTable, assignedTo: crewMembersTable })
      .from(tasksTable)
      .leftJoin(crewMembersTable, eq(tasksTable.assignedToId, crewMembersTable.id))
      .where(eq(tasksTable.id, task.id));
    res.status(201).json({ ...result.task, assignedTo: result.assignedTo ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid input" });
  }
});

router.put("/tasks/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updateSchema = z.object({
      title: z.string().optional(),
      description: z.string().nullable().optional(),
      status: z.enum(["pending", "in_progress", "completed"]).optional(),
      assignedToId: z.number().nullable().optional(),
    });
    const input = updateSchema.parse(req.body);
    const [task] = await db.update(tasksTable).set(input).where(eq(tasksTable.id, id)).returning();
    if (!task) return res.status(404).json({ error: "Task not found" });

    const [result] = await db
      .select({ task: tasksTable, assignedTo: crewMembersTable })
      .from(tasksTable)
      .leftJoin(crewMembersTable, eq(tasksTable.assignedToId, crewMembersTable.id))
      .where(eq(tasksTable.id, id));
    res.json({ ...result.task, assignedTo: result.assignedTo ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid input" });
  }
});

router.delete("/tasks/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(tasksTable).where(eq(tasksTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

export default router;
