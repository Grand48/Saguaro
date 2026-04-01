import { Router, type IRouter } from "express";
import { db, sideQuestsTable, crewMembersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

// List all side quests with claimedBy crew info
router.get("/side-quests", async (req, res) => {
  try {
    const rows = await db
      .select({ quest: sideQuestsTable, claimedBy: crewMembersTable })
      .from(sideQuestsTable)
      .leftJoin(crewMembersTable, eq(sideQuestsTable.claimedByCrewId, crewMembersTable.id))
      .orderBy(sideQuestsTable.createdAt);
    res.json(rows.map((r) => ({ ...r.quest, claimedBy: r.claimedBy ?? null })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list side quests" });
  }
});

// Create a side quest
router.post("/side-quests", async (req, res) => {
  try {
    const schema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
      adminLocked: z.boolean().default(true),
    });
    const input = schema.parse(req.body);
    const [quest] = await db.insert(sideQuestsTable).values(input).returning();
    res.status(201).json(quest);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid input" });
  }
});

// Update a side quest (admin lock/unlock, claim, complete)
router.patch("/side-quests/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const schema = z.object({
      title: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      adminLocked: z.boolean().optional(),
      status: z.enum(["open", "claimed", "completed"]).optional(),
      claimedByCrewId: z.number().nullable().optional(),
    });
    const updates = schema.parse(req.body);

    // Handle claim: set claimedAt
    const extra: Record<string, unknown> = {};
    if (updates.status === "claimed" && updates.claimedByCrewId) {
      extra.claimedAt = new Date();
    }
    if (updates.status === "completed") {
      extra.completedAt = new Date();
    }
    if (updates.status === "open") {
      extra.claimedByCrewId = null;
      extra.claimedAt = null;
      extra.completedAt = null;
    }

    const [quest] = await db
      .update(sideQuestsTable)
      .set({ ...updates, ...extra })
      .where(eq(sideQuestsTable.id, id))
      .returning();

    if (!quest) return res.status(404).json({ error: "Not found" });

    // Return with claimedBy
    const [result] = await db
      .select({ quest: sideQuestsTable, claimedBy: crewMembersTable })
      .from(sideQuestsTable)
      .leftJoin(crewMembersTable, eq(sideQuestsTable.claimedByCrewId, crewMembersTable.id))
      .where(eq(sideQuestsTable.id, id));

    res.json({ ...result.quest, claimedBy: result.claimedBy ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid input" });
  }
});

// Delete a side quest
router.delete("/side-quests/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(sideQuestsTable).where(eq(sideQuestsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete" });
  }
});

export default router;
