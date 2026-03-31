import { Router, type IRouter } from "express";
import { db, messagesTable, insertMessageSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/jobs/:id/messages", async (req, res) => {
  try {
    const jobId = Number(req.params.id);
    const msgs = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.jobId, jobId))
      .orderBy(messagesTable.createdAt);
    res.json(msgs);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list messages" });
  }
});

router.post("/jobs/:id/messages", async (req, res) => {
  try {
    const jobId = Number(req.params.id);
    const input = insertMessageSchema.parse({ ...req.body, jobId });
    const [msg] = await db.insert(messagesTable).values(input).returning();
    res.status(201).json(msg);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid input" });
  }
});

router.delete("/messages/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(messagesTable).where(eq(messagesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete message" });
  }
});

export default router;
