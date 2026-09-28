import { Worker, Job, DelayedError } from "bullmq";
import { redisConnection } from "../redis/client";
import { prisma } from "../db/prisma";
import { EMAIL_QUEUE_NAME } from "./emailQueue";
import { tryConsumeSlot, waitForSendSlot, requeueRank, claimSlackAlert } from "./rateLimiter";
import { recoverOrphanedSchedules } from "./recovery";
import { sendEmail } from "../services/mailer";
import { notifyRateLimitHit } from "../services/slack";
import { indexEmail } from "../services/search";
import { renderBody } from "../utils/render";
import { env } from "../config/env";

const STALE_CLAIM_MS = 2 * 60 * 1000;

async function processJob(job: Job<{ scheduledEmailId: string }>, token?: string) {
  const id = job.data.scheduledEmailId;

  // 1) IDEMPOTENT CLAIM - one atomic UPDATE decides which worker owns the row.
  //    SENT / already-PROCESSING rows match nothing -> a redelivered or duplicate job is a no-op.
  //    A PROCESSING row is only re-claimable if its claim is stale (worker died mid-flight).
  const claim = await prisma.scheduledEmail.updateMany({
    where: {
      id,
      OR: [
        { status: { in: ["SCHEDULED", "RATE_LIMITED_REQUEUED"] } },
        { status: "PROCESSING", claimedAt: { lt: new Date(Date.now() - STALE_CLAIM_MS) } },
      ],
    },
    data: { status: "PROCESSING", claimedAt: new Date() },
  });
  if (claim.count === 0) return;

  const email = await prisma.scheduledEmail.findUniqueOrThrow({
    where: { id },
    include: { batch: true },
  });

  // 2) HOURLY LIMIT (Redis Lua, per sender, cross-instance safe). Limit comes from the batch (UI), not env.
  const slot = await tryConsumeSlot(email.senderEmail, email.batch.hourlyLimit);
  if (!slot.allowed) {
    await prisma.scheduledEmail.update({
      where: { id },
      data: { status: "RATE_LIMITED_REQUEUED", claimedAt: null },
    });
    // Slack: exactly one alert per sender per hour window, never crashes the job.
    if (await claimSlackAlert(email.senderEmail)) {
      await notifyRateLimitHit({
        userId: email.batch.userId,
        senderEmail: email.senderEmail,
        limit: slot.limit,
        resumeAt: slot.resumeAt,
      });
    }
    // Not dropped, not failed: move THIS job to the next hour window (order kept via rank).
    const rank = await requeueRank(email.senderEmail, slot.resumeAt);
    await job.moveToDelayed(slot.resumeAt.getTime() + rank * 10, token);
    throw new DelayedError();
  }

  // 3) MIN DELAY BETWEEN SENDS - atomic per-sender slot reservation.
  await waitForSendSlot(email.senderEmail, Math.max(env.minDelayMsBetweenSends, email.batch.delayMs));

  try {
    const info = await sendEmail({
      senderEmail: email.senderEmail,
      to: email.recipient,
      subject: email.subject,
      html: renderBody(email.body, email.recipient),
    });
    const sentAt = new Date();
    await prisma.scheduledEmail.update({
      where: { id },
      data: {
        status: "SENT",
        sentAt,
        attempts: { increment: 1 },
        messageId: info.messageId,
        previewUrl: info.previewUrl || null,
        lastError: null,
      },
    });
    await indexEmail({
      id,
      userId: email.batch.userId,
      recipient: email.recipient,
      subject: email.subject,
      body: email.body,
      senderEmail: email.senderEmail,
      status: "SENT",
      scheduledAt: email.scheduledAt,
      sentAt,
    }).catch((e) => console.error("[es] index failed (non-fatal):", e.message));
  } catch (err: any) {
    // Only show FAILED once retries are exhausted; otherwise it is still pending.
    const finalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
    await prisma.scheduledEmail.update({
      where: { id },
      data: {
        status: finalAttempt ? "FAILED" : "SCHEDULED",
        claimedAt: null,
        attempts: { increment: 1 },
        lastError: String(err?.message ?? err),
      },
    });
    if (finalAttempt) {
      await indexEmail({
        id,
        userId: email.batch.userId,
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        senderEmail: email.senderEmail,
        status: "FAILED",
        scheduledAt: email.scheduledAt,
        sentAt: null,
      }).catch(() => undefined);
    }
    throw err; // BullMQ applies exponential backoff and retries
  }
}

async function main() {
  const worker = new Worker(EMAIL_QUEUE_NAME, processJob, {
    connection: redisConnection,
    concurrency: env.workerConcurrency, // configurable via WORKER_CONCURRENCY
  });
  worker.on("failed", (job, err) => console.error(`[worker] job ${job?.id} failed: ${err.message}`));
  worker.on("completed", (job) => console.log(`[worker] job ${job.id} done`));

  const recovered = await recoverOrphanedSchedules();
  console.log(`[worker] started (concurrency=${env.workerConcurrency}), recovered ${recovered} orphaned job(s)`);

  const shutdown = async () => {
    console.log("[worker] shutting down gracefully...");
    await worker.close(); // lets in-flight jobs finish; unfinished ones stay safely in Redis
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
