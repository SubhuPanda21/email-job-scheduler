import { Queue } from "bullmq";
import { redisConnection } from "../redis/client";

export const EMAIL_QUEUE_NAME = "email-send";


export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 60 * 60 * 24 * 7 },
    removeOnFail: false,
  },
});


export async function enqueueMany(items: { id: string; runAt: Date }[]) {
  if (!items.length) return;
  await emailQueue.addBulk(
    items.map((i) => ({
      name: "send-email",
      data: { scheduledEmailId: i.id },
      opts: { jobId: i.id, delay: Math.max(0, i.runAt.getTime() - Date.now()) },
    }))
  );
}
