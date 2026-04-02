import { Router, type IRouter } from "express";
import { db, vehiclesTable, vehicleMaintenanceTable, insertVehicleSchema, insertVehicleMaintenanceSchema } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

// ── Vehicles ────────────────────────────────────────────────────────────────

router.get("/vehicles", async (_req, res) => {
  try {
    const vehicles = await db.select().from(vehiclesTable).orderBy(vehiclesTable.vehicleNumber);
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch vehicles" });
  }
});

router.get("/vehicles/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, id));
    if (!rows.length) return res.status(404).json({ error: "Vehicle not found" });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to fetch vehicle" });
  }
});

router.post("/vehicles", async (req, res) => {
  try {
    const data = insertVehicleSchema.parse(req.body);
    const [vehicle] = await db.insert(vehiclesTable).values(data).returning();
    res.status(201).json(vehicle);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: "Failed to create vehicle" });
  }
});

router.put("/vehicles/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = insertVehicleSchema.partial().parse(req.body);
    const [updated] = await db.update(vehiclesTable).set(data).where(eq(vehiclesTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Vehicle not found" });
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: "Failed to update vehicle" });
  }
});

router.delete("/vehicles/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(vehicleMaintenanceTable).where(eq(vehicleMaintenanceTable.vehicleId, id));
    await db.delete(vehiclesTable).where(eq(vehiclesTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete vehicle" });
  }
});

// ── Maintenance ──────────────────────────────────────────────────────────────

router.get("/vehicles/:id/maintenance", async (req, res) => {
  try {
    const vehicleId = parseInt(req.params.id);
    const records = await db
      .select()
      .from(vehicleMaintenanceTable)
      .where(eq(vehicleMaintenanceTable.vehicleId, vehicleId))
      .orderBy(desc(vehicleMaintenanceTable.createdAt));
    res.json(records);
  } catch {
    res.status(500).json({ error: "Failed to fetch maintenance records" });
  }
});

router.post("/vehicles/:id/maintenance", async (req, res) => {
  try {
    const vehicleId = parseInt(req.params.id);
    const data = insertVehicleMaintenanceSchema.parse({ ...req.body, vehicleId });
    const [record] = await db.insert(vehicleMaintenanceTable).values(data).returning();
    res.status(201).json(record);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: "Failed to create maintenance record" });
  }
});

router.put("/maintenance/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = insertVehicleMaintenanceSchema.partial().parse(req.body);
    const [updated] = await db.update(vehicleMaintenanceTable).set(data).where(eq(vehicleMaintenanceTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Maintenance record not found" });
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: "Failed to update maintenance record" });
  }
});

router.delete("/maintenance/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(vehicleMaintenanceTable).where(eq(vehicleMaintenanceTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete maintenance record" });
  }
});

export default router;
