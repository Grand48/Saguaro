import { Router, type IRouter } from "express";
import { db, photosTable, insertPhotoSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/jobs/:id/photos", async (req, res) => {
  try {
    const jobId = Number(req.params.id);
    const photos = await db
      .select()
      .from(photosTable)
      .where(eq(photosTable.jobId, jobId))
      .orderBy(photosTable.createdAt);
    res.json(photos);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list photos" });
  }
});

router.post("/jobs/:id/photos", async (req, res) => {
  try {
    const jobId = Number(req.params.id);
    const input = insertPhotoSchema.parse({ ...req.body, jobId });
    const [photo] = await db.insert(photosTable).values(input).returning();
    res.status(201).json(photo);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid input" });
  }
});

router.delete("/photos/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(photosTable).where(eq(photosTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete photo" });
  }
});

export default router;
