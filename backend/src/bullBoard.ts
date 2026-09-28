import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { emailQueue } from "./queue/emailQueue";

// Live queue visibility, as required: waiting/delayed/active/completed/failed
// jobs, retry/remove controls — mounted at /admin/queues.
export function mountBullBoard() {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");
  createBullBoard({ queues: [new BullMQAdapter(emailQueue) as any], serverAdapter });
  return serverAdapter.getRouter();
}
