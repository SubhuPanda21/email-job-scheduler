import { prisma } from "../db/prisma";
import { emailQueue, enqueueMany } from "./emailQueue";

/**
 * Belt-and-braces on worker boot. Redis AOF already keeps delayed jobs across restarts; this
 * re-enqueues any unfinished DB row whose BullMQ job is missing (e.g. Redis was wiped, or the
 * API crashed between the DB commit and the enqueue). Safe to run any time: enqueue is idempotent.
 */
export async function recoverOrphanedSchedules(): Promise<number> {
  const rows = await prisma.scheduledEmail.findMany({
    where: { status: { in: ["SCHEDULED", "PROCESSING", "RATE_LIMITED_REQUEUED"] } },
    select: { id: true, scheduledAt: true },
  });
  const missing: { id: string; runAt: Date }[] = [];
  for (const r of rows) {
    if (!(await emailQueue.getJob(r.id))) missing.push({ id: r.id, runAt: r.scheduledAt });
  }
  await enqueueMany(missing);
  return missing.length;
}
