import { Router, type IRouter } from "express";
import { db, employeeRequestsTable, crewMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

// List all requests (optionally filter by crewId or status)
router.get("/employee-requests", async (req, res) => {
  try {
    const crewIdParam = req.query["crewId"];
    const statusParam = req.query["status"];

    let conditions = [];
    if (crewIdParam) conditions.push(eq(employeeRequestsTable.crewId, Number(crewIdParam)));
    if (statusParam) conditions.push(eq(employeeRequestsTable.status, String(statusParam)));

    const rows = await db
      .select({ request: employeeRequestsTable, crew: crewMembersTable })
      .from(employeeRequestsTable)
      .leftJoin(crewMembersTable, eq(employeeRequestsTable.crewId, crewMembersTable.id))
      .where(conditions.length ? and(...(conditions as [ReturnType<typeof eq>, ...ReturnType<typeof eq>[]])) : undefined)
      .orderBy(employeeRequestsTable.createdAt);

    res.json(rows.map((r) => ({ ...r.request, crew: r.crew ?? null })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list requests" });
  }
});

// Create a request
router.post("/employee-requests", async (req, res) => {
  try {
    const schema = z.object({
      crewId: z.number().int(),
      category: z.enum(["tool", "equipment", "supply", "other"]).default("supply"),
      title: z.string().min(1),
      description: z.string().optional(),
      quantity: z.number().int().min(1).default(1),
      priority: z.enum(["low", "normal", "urgent"]).default("normal"),
    });
    const input = schema.parse(req.body);
    const [request] = await db.insert(employeeRequestsTable).values(input).returning();

    const [result] = await db
      .select({ request: employeeRequestsTable, crew: crewMembersTable })
      .from(employeeRequestsTable)
      .leftJoin(crewMembersTable, eq(employeeRequestsTable.crewId, crewMembersTable.id))
      .where(eq(employeeRequestsTable.id, request.id));

    res.status(201).json({ ...result.request, crew: result.crew ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid input" });
  }
});

// Fulfill a request (marks as fulfilled)
router.patch("/employee-requests/:id/fulfill", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [request] = await db
      .update(employeeRequestsTable)
      .set({ status: "fulfilled", fulfilledAt: new Date() })
      .where(eq(employeeRequestsTable.id, id))
      .returning();
    if (!request) return res.status(404).json({ error: "Not found" });
    res.json(request);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fulfill request" });
  }
});

// Delete a request (used by admin to remove fulfilled or any request)
router.delete("/employee-requests/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(employeeRequestsTable).where(eq(employeeRequestsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete request" });
  }
});

export default router;
