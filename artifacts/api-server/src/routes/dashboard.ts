import { Router, type IRouter } from "express";
import { db, jobsTable, crewMembersTable, tasksTable } from "@workspace/db";
import { eq, gte, lte, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res) => {
  try {
    const [totalJobsRow] = await db.select({ count: sql<number>`count(*)::int` }).from(jobsTable);
    const [activeJobsRow] = await db.select({ count: sql<number>`count(*)::int` }).from(jobsTable).where(eq(jobsTable.status, "in_progress"));
    const [completedJobsRow] = await db.select({ count: sql<number>`count(*)::int` }).from(jobsTable).where(eq(jobsTable.status, "completed"));
    const [totalCrewRow] = await db.select({ count: sql<number>`count(*)::int` }).from(crewMembersTable);
    const [pendingTasksRow] = await db.select({ count: sql<number>`count(*)::int` }).from(tasksTable).where(eq(tasksTable.status, "pending"));
    const [completedTasksRow] = await db.select({ count: sql<number>`count(*)::int` }).from(tasksTable).where(eq(tasksTable.status, "completed"));

    res.json({
      totalJobs: totalJobsRow?.count ?? 0,
      activeJobs: activeJobsRow?.count ?? 0,
      completedJobs: completedJobsRow?.count ?? 0,
      totalCrew: totalCrewRow?.count ?? 0,
      pendingTasks: pendingTasksRow?.count ?? 0,
      completedTasks: completedTasksRow?.count ?? 0,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get dashboard summary" });
  }
});

router.get("/dashboard/upcoming-jobs", async (req, res) => {
  try {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const jobs = await db
      .select()
      .from(jobsTable)
      .where(and(gte(jobsTable.startDate, now), lte(jobsTable.startDate, nextWeek)))
      .orderBy(jobsTable.startDate);
    res.json(jobs);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get upcoming jobs" });
  }
});

export default router;
