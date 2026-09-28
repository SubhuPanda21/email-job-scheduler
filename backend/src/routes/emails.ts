import { Router } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { enqueueMany } from "../queue/emailQueue";
import { bulkIndex, searchEmails } from "../services/search";
import { listSenders } from "../services/mailer";
import { extractEmails } from "../utils/leads";
import { env } from "../config/env";
import { sanitizeBody } from "../utils/sanitize";
import { htmlToPreview, renderBody } from "../utils/render";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const MAX_BATCH = 5000;

const scheduleSchema = z.object({
  subject: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(100_000),
  senderEmail: z.string().email(),
  startTime: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date"),
  delayMs: z.coerce.number().int().min(0).max(3_600_000),
  hourlyLimit: z.coerce.number().int().min(1).max(100_000).default(env.maxEmailsPerHourPerSender),
  emails: z.array(z.string().email()).min(1).max(MAX_BATCH),
  idempotencyKey: z.string().min(8).max(100).optional(),
});

// Env-driven defaults so the UI and API share one source of truth (nothing hardcoded).
router.get("/config", requireAuth, (_req, res) =>
  res.json({ hourlyLimit: env.maxEmailsPerHourPerSender, delayMs: env.minDelayMsBetweenSends, maxBatch: MAX_BATCH })
);

router.get("/senders", requireAuth, (_req, res) => res.json(listSenders()));

router.post("/parse-leads", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const emails = extractEmails(req.file.buffer.toString("utf-8"));
  res.json({ count: emails.length, emails });
});

router.post("/schedule", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
  }
  const d = parsed.data;
  if (!listSenders().includes(d.senderEmail)) {
    return res.status(400).json({ error: `Unknown sender. Configured senders: ${listSenders().join(", ") || "none"}` });
  }

  // Idempotent submit: same key => return the original batch instead of creating a second one.
  if (d.idempotencyKey) {
    const existing = await prisma.emailBatch.findUnique({
      where: { idempotencyKey: d.idempotencyKey },
      include: { _count: { select: { scheduledEmails: true } } },
    });
    if (existing) return res.json({ batchId: existing.id, scheduled: existing._count.scheduledEmails, duplicate: true });
  }

  const body = sanitizeBody(d.body);
  if (!htmlToPreview(body, 1000)) return res.status(400).json({ error: "Email body is empty" });

  const recipients = [...new Set(d.emails.map((e) => e.toLowerCase()))];
  const base = new Date(d.startTime).getTime();
  const batchId = randomUUID();
  const rows = recipients.map((recipient, i) => ({
    id: randomUUID(),
    batchId,
    recipient,
    subject: d.subject,
    body,
    senderEmail: d.senderEmail,
    scheduledAt: new Date(base + i * d.delayMs),
  }));

  // One transaction: a batch never exists half-written.
  await prisma.$transaction([
    prisma.emailBatch.create({
      data: {
        id: batchId,
        userId: req.userId!,
        subject: d.subject,
        body,
        senderEmail: d.senderEmail,
        startTime: new Date(d.startTime),
        delayMs: d.delayMs,
        hourlyLimit: d.hourlyLimit,
        idempotencyKey: d.idempotencyKey,
      },
    }),
    prisma.scheduledEmail.createMany({ data: rows }),
  ]);

  // If enqueue fails here the rows are safe in Postgres and the worker's boot recovery re-enqueues them.
  await enqueueMany(rows.map((r) => ({ id: r.id, runAt: r.scheduledAt })));

  // Searchable immediately as SCHEDULED (non-blocking: ES being down never blocks scheduling).
  bulkIndex(rows.map((r) => ({ ...r, userId: req.userId!, status: "SCHEDULED", sentAt: null }))).catch((e) =>
    console.error("[es] bulk index failed:", e.message)
  );

  res.status(201).json({ batchId, scheduled: rows.length, duplicatesRemoved: d.emails.length - recipients.length });
});

const listSelect = {
  id: true, recipient: true, subject: true, body: true, senderEmail: true, scheduledAt: true,
  sentAt: true, status: true, previewUrl: true, lastError: true,
} as const;

// List rows carry a short plain-text preview instead of the full HTML body.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toListItem = ({ body, ...rest }: any) => ({ ...rest, preview: htmlToPreview(body ?? "") });

router.get("/scheduled", requireAuth, async (req: AuthedRequest, res) => {
  const rows = await prisma.scheduledEmail.findMany({
    where: { batch: { userId: req.userId }, status: { in: ["SCHEDULED", "PROCESSING", "RATE_LIMITED_REQUEUED"] } },
    orderBy: { scheduledAt: "asc" },
    take: 500,
    select: listSelect,
  });
  res.json(rows.map(toListItem));
});

router.get("/sent", requireAuth, async (req: AuthedRequest, res) => {
  const rows = await prisma.scheduledEmail.findMany({
    where: { batch: { userId: req.userId }, status: { in: ["SENT", "FAILED"] } },
    orderBy: { sentAt: { sort: "desc", nulls: "last" } },
    take: 500,
    select: listSelect,
  });
  res.json(rows.map(toListItem));
});

router.get("/stats", requireAuth, async (req: AuthedRequest, res) => {
  const groups = await prisma.scheduledEmail.groupBy({
    by: ["status"],
    where: { batch: { userId: req.userId } },
    _count: true,
  });
  res.json(Object.fromEntries(groups.map((g: { status: string; _count: number }) => [g.status, g._count])));
});

router.get("/search", requireAuth, async (req: AuthedRequest, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) return res.json([]);
  try {
    res.json(((await searchEmails(q, req.userId!)) as object[]).map(toListItem));
  } catch {
    res.status(503).json({ error: "Search is temporarily unavailable" });
  }
});

// Single email (detail view). Declared last so it never shadows the fixed routes above.
router.get("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) return res.status(404).json({ error: "Not found" });
  const row = await prisma.scheduledEmail.findFirst({
    where: { id: id.data, batch: { userId: req.userId } }, // ownership enforced
    select: listSelect,
  });
  if (!row) return res.status(404).json({ error: "Not found" });
  const { body, ...rest } = row;
  res.json({ ...rest, html: renderBody(body, row.recipient) });
});

export default router;
