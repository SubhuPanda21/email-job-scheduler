import { prisma } from "../db/prisma";
import { emailQueue, enqueueMany } from "./emailQueue";


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
