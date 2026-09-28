import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { emailQueue } from "./queue/emailQueue";

export function mountBullBoard() {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");
  createBullBoard({ queues: [new BullMQAdapter(emailQueue) as any], serverAdapter });
  return serverAdapter.getRouter();
}
