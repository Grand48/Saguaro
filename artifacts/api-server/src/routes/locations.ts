import { Router } from "express";
import { db, locationsTable, insertLocationSchema, jobsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/locations", async (req, res) => {
  const locations = await db.select().from(locationsTable).orderBy(locationsTable.name);
  const jobs = await db.select({ id: jobsTable.id, title: jobsTable.title, status: jobsTable.status, locationId: jobsTable.locationId }).from(jobsTable);
  const result = locations.map((loc) => ({
    ...loc,
    jobs: jobs.filter((j) => j.locationId === loc.id),
  }));
  res.json(result);
});

router.get("/locations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [location] = await db.select().from(locationsTable).where(eq(locationsTable.id, id));
  if (!location) return res.status(404).json({ error: "Location not found" });
  const jobs = await db.select().from(jobsTable).where(eq(jobsTable.locationId, id));
  res.json({ ...location, jobs });
});

router.post("/locations", async (req, res) => {
  const parsed = insertLocationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });
  const [location] = await db.insert(locationsTable).values(parsed.data).returning();
  res.status(201).json(location);
});

router.put("/locations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const updateSchema = insertLocationSchema.partial();
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });
  const [location] = await db.update(locationsTable).set(parsed.data).where(eq(locationsTable.id, id)).returning();
  if (!location) return res.status(404).json({ error: "Location not found" });
  res.json(location);
});

router.delete("/locations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(locationsTable).where(eq(locationsTable.id, id));
  res.status(204).send();
});

export default router;
