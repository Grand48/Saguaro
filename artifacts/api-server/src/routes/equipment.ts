import { Router, type IRouter } from "express";
import { db, equipmentTable, insertEquipmentSchema } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

router.get("/jobs/:id/equipment", async (req, res) => {
  try {
    const jobId = Number(req.params.id);
    const items = await db
      .select()
      .from(equipmentTable)
      .where(eq(equipmentTable.jobId, jobId))
      .orderBy(equipmentTable.createdAt);
    res.json(items);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list equipment" });
  }
});

router.post("/jobs/:id/equipment", async (req, res) => {
  try {
    const jobId = Number(req.params.id);
    const input = insertEquipmentSchema.parse({ ...req.body, jobId });
    const [item] = await db.insert(equipmentTable).values(input).returning();
    res.status(201).json(item);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid input" });
  }
});

router.put("/equipment/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updateSchema = z.object({
      name: z.string().optional(),
      quantity: z.number().int().min(1).optional(),
      notes: z.string().nullable().optional(),
      status: z.enum(["needed", "reserved", "on_site", "returned"]).optional(),
    });
    const input = updateSchema.parse(req.body);
    const [item] = await db.update(equipmentTable).set(input).where(eq(equipmentTable.id, id)).returning();
    if (!item) return res.status(404).json({ error: "Equipment item not found" });
    res.json(item);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid input" });
  }
});

router.delete("/equipment/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(equipmentTable).where(eq(equipmentTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete equipment item" });
  }
});

export default router;
