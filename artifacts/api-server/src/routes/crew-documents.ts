import { Router } from "express";
import { db, crewDocumentsTable, insertCrewDocumentSchema } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

router.get("/crew/:crewId/documents", async (req, res) => {
  try {
    const crewId = parseInt(req.params.crewId);
    const docs = await db
      .select({
        id: crewDocumentsTable.id,
        crewId: crewDocumentsTable.crewId,
        title: crewDocumentsTable.title,
        docType: crewDocumentsTable.docType,
        fileName: crewDocumentsTable.fileName,
        fileMimeType: crewDocumentsTable.fileMimeType,
        expiryDate: crewDocumentsTable.expiryDate,
        notes: crewDocumentsTable.notes,
        createdAt: crewDocumentsTable.createdAt,
      })
      .from(crewDocumentsTable)
      .where(eq(crewDocumentsTable.crewId, crewId))
      .orderBy(crewDocumentsTable.createdAt);
    res.json(docs);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list documents" });
  }
});

router.get("/crew-documents/:id/download", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [doc] = await db
      .select()
      .from(crewDocumentsTable)
      .where(eq(crewDocumentsTable.id, id));
    if (!doc) return res.status(404).json({ error: "Document not found" });
    const base64Data = doc.fileData.split(",")[1] ?? doc.fileData;
    const buffer = Buffer.from(base64Data, "base64");
    res.set("Content-Type", doc.fileMimeType);
    res.set("Content-Disposition", `attachment; filename="${doc.fileName}"`);
    res.send(buffer);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to download document" });
  }
});

router.post("/crew/:crewId/documents", async (req, res) => {
  try {
    const crewId = parseInt(req.params.crewId);
    const body = {
      ...req.body,
      crewId,
      expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : undefined,
    };
    const parsed = insertCrewDocumentSchema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const [doc] = await db.insert(crewDocumentsTable).values(parsed.data).returning();
    const { fileData: _, ...docWithoutData } = doc;
    res.status(201).json(docWithoutData);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid input" });
  }
});

router.delete("/crew-documents/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(crewDocumentsTable).where(eq(crewDocumentsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

export default router;
