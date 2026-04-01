import { Router } from "express";
import { db, notificationsTable, notificationReadsTable, insertNotificationSchema, crewMembersTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// List all notifications with read counts (admin view)
router.get("/notifications", async (req, res) => {
  try {
    const notifications = await db
      .select()
      .from(notificationsTable)
      .orderBy(desc(notificationsTable.createdAt));

    const totalCrew = await db.select({ count: sql<number>`count(*)` }).from(crewMembersTable);
    const total = Number(totalCrew[0]?.count ?? 0);

    const reads = await db.select().from(notificationReadsTable);
    const readCountById = reads.reduce<Record<number, number>>((acc, r) => {
      acc[r.notificationId] = (acc[r.notificationId] ?? 0) + 1;
      return acc;
    }, {});

    res.json(notifications.map((n) => ({
      ...n,
      readCount: readCountById[n.id] ?? 0,
      totalCrew: total,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list notifications" });
  }
});

// Get notifications for a specific crew member with read status
router.get("/notifications/crew/:crewId", async (req, res) => {
  try {
    const crewId = parseInt(req.params.crewId);
    const notifications = await db
      .select()
      .from(notificationsTable)
      .orderBy(desc(notificationsTable.createdAt));

    const reads = await db
      .select()
      .from(notificationReadsTable)
      .where(eq(notificationReadsTable.crewId, crewId));

    const readSet = new Set(reads.map((r) => r.notificationId));

    res.json(notifications.map((n) => ({ ...n, isRead: readSet.has(n.id) })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get notifications" });
  }
});

// Get unread count for a crew member
router.get("/notifications/crew/:crewId/unread-count", async (req, res) => {
  try {
    const crewId = parseInt(req.params.crewId);
    const total = await db.select({ count: sql<number>`count(*)` }).from(notificationsTable);
    const read = await db.select({ count: sql<number>`count(*)` })
      .from(notificationReadsTable)
      .where(eq(notificationReadsTable.crewId, crewId));
    const unread = Math.max(0, Number(total[0]?.count ?? 0) - Number(read[0]?.count ?? 0));
    res.json({ unread });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get unread count" });
  }
});

// Broadcast a notification to all crew
router.post("/notifications", async (req, res) => {
  try {
    const parsed = insertNotificationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const [notification] = await db.insert(notificationsTable).values(parsed.data).returning();
    res.status(201).json(notification);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid input" });
  }
});

// Mark a notification as read for a crew member
router.post("/notifications/:id/read", async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const { crewId } = z.object({ crewId: z.number() }).parse(req.body);

    const existing = await db
      .select()
      .from(notificationReadsTable)
      .where(and(
        eq(notificationReadsTable.notificationId, notificationId),
        eq(notificationReadsTable.crewId, crewId)
      ));

    if (existing.length === 0) {
      await db.insert(notificationReadsTable).values({ notificationId, crewId });
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Failed to mark as read" });
  }
});

// Delete a notification
router.delete("/notifications/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(notificationsTable).where(eq(notificationsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

export default router;
