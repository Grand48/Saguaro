import { Router, type IRouter } from "express";
import { db, jobFormsTable, crewMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

// List forms for a job
router.get("/jobs/:id/forms", async (req, res) => {
  try {
    const jobId = Number(req.params.id);
    const rows = await db
      .select({ form: jobFormsTable, crew: crewMembersTable })
      .from(jobFormsTable)
      .leftJoin(crewMembersTable, eq(jobFormsTable.signedByCrewId, crewMembersTable.id))
      .where(eq(jobFormsTable.jobId, jobId))
      .orderBy(jobFormsTable.createdAt);
    res.json(rows.map((r) => ({ ...r.form, signedByCrew: r.crew ?? null })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list forms" });
  }
});

// Create a new form (starts as draft)
router.post("/jobs/:id/forms", async (req, res) => {
  try {
    const jobId = Number(req.params.id);
    const schema = z.object({
      formType: z.enum(["job_completion", "quality_control", "custom", "safe_work_permit"]),
      customFormName: z.string().optional(),
      customFormData: z.string().optional(),
    });
    const { formType, customFormName, customFormData } = schema.parse(req.body);
    const [form] = await db
      .insert(jobFormsTable)
      .values({ jobId, formType, status: "draft", customFormName, customFormData })
      .returning();
    res.status(201).json({ ...form, signedByCrew: null });
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid input" });
  }
});

// Submit (sign) a form
router.patch("/jobs/:id/forms/:formId", async (req, res) => {
  try {
    const formId = Number(req.params.formId);
    const schema = z.object({
      fields: z.record(z.string()).optional(),
      signatureName: z.string().optional(),
      signatureData: z.string().optional(),
      signedByCrewId: z.number().int().optional(),
    });
    const input = schema.parse(req.body);

    const updates: Record<string, unknown> = {};
    if (input.fields !== undefined) updates.fields = JSON.stringify(input.fields);
    if (input.signatureName !== undefined) updates.signatureName = input.signatureName;
    if (input.signatureData !== undefined) updates.signatureData = input.signatureData;
    if (input.signedByCrewId !== undefined) updates.signedByCrewId = input.signedByCrewId;

    // Mark signed if signature provided
    if (input.signatureName && input.signatureData) {
      updates.status = "signed";
      updates.signedAt = new Date();
    }

    const [form] = await db
      .update(jobFormsTable)
      .set(updates)
      .where(eq(jobFormsTable.id, formId))
      .returning();

    if (!form) return res.status(404).json({ error: "Not found" });

    const [result] = await db
      .select({ form: jobFormsTable, crew: crewMembersTable })
      .from(jobFormsTable)
      .leftJoin(crewMembersTable, eq(jobFormsTable.signedByCrewId, crewMembersTable.id))
      .where(eq(jobFormsTable.id, formId));

    res.json({ ...result.form, signedByCrew: result.crew ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Invalid input" });
  }
});

// Delete a form
router.delete("/jobs/:id/forms/:formId", async (req, res) => {
  try {
    const formId = Number(req.params.formId);
    await db.delete(jobFormsTable).where(eq(jobFormsTable.id, formId));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete form" });
  }
});

export default router;
