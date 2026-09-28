import "dotenv/config";
import { randomUUID } from "crypto";
import { prisma } from "../src/db/prisma";
import { enqueueMany } from "../src/queue/emailQueue";
import { listSenders } from "../src/services/mailer";


async function main() {
  const [email, count = "1000", limit = "50"] = process.argv.slice(2);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Log in via the UI once first so your user exists.");
  const sender = listSenders()[0];
  const batchId = randomUUID();
  const now = new Date();
  const rows = Array.from({ length: Number(count) }, (_, i) => ({
    id: randomUUID(), batchId, recipient: `load${i}@example.com`, subject: "Load test",
    body: "Hello {{email}}", senderEmail: sender, scheduledAt: now,
  }));
  await prisma.emailBatch.create({
    data: { id: batchId, userId: user.id, subject: "Load test", body: "Hello", senderEmail: sender,
      startTime: now, delayMs: 0, hourlyLimit: Number(limit) },
  });
  await prisma.scheduledEmail.createMany({ data: rows });
  await enqueueMany(rows.map((r) => ({ id: r.id, runAt: r.scheduledAt })));
  console.log(`Enqueued ${rows.length} emails, hourly limit ${limit}. Watch /admin/queues.`);
  process.exit(0);
}
main();
