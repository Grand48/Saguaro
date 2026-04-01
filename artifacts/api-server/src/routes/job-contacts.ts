import { Router } from "express";
import { db, jobContactsTable, insertJobContactSchema, updateJobContactSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/jobs/:jobId/contacts", async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId);
    const contacts = await db
      .select()
      .from(jobContactsTable)
      .where(eq(jobContactsTable.jobId, jobId))
      .orderBy(jobContactsTable.createdAt);
    res.json(contacts);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list contacts" });
  }
});

router.post("/jobs/:jobId/contacts", async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId);
    const parsed = insertJobContactSchema.safeParse({ ...req.body, jobId });
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const [contact] = await db.insert(jobContactsTable).values(parsed.data).returning();
    res.status(201).json(contact);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid input" });
  }
});

router.put("/job-contacts/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const parsed = updateJobContactSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const [updated] = await db
      .update(jobContactsTable)
      .set(parsed.data)
      .where(eq(jobContactsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Contact not found" });
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid input" });
  }
});

router.delete("/job-contacts/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(jobContactsTable).where(eq(jobContactsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete contact" });
  }
});

export default router;
