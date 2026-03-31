import { Router, type IRouter } from "express";
import { db, crewMembersTable, insertCrewMemberSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/crew", async (req, res) => {
  try {
    const crew = await db.select().from(crewMembersTable).orderBy(crewMembersTable.createdAt);
    res.json(crew);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list crew" });
  }
});

router.post("/crew", async (req, res) => {
  try {
    const input = insertCrewMemberSchema.parse(req.body);
    const [member] = await db.insert(crewMembersTable).values(input).returning();
    res.status(201).json(member);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid input" });
  }
});

router.get("/crew/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [member] = await db.select().from(crewMembersTable).where(eq(crewMembersTable.id, id));
    if (!member) return res.status(404).json({ error: "Crew member not found" });
    res.json(member);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get crew member" });
  }
});

router.put("/crew/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const input = insertCrewMemberSchema.parse(req.body);
    const [member] = await db.update(crewMembersTable).set(input).where(eq(crewMembersTable.id, id)).returning();
    if (!member) return res.status(404).json({ error: "Crew member not found" });
    res.json(member);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid input" });
  }
});

router.delete("/crew/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(crewMembersTable).where(eq(crewMembersTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete crew member" });
  }
});

export default router;
