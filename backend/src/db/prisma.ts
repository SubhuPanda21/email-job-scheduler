import { PrismaClient } from "@prisma/client";

// Single shared instance — avoids exhausting Postgres connections under
// BullMQ worker concurrency (each job handler reuses this, doesn't open its own).
export const prisma = new PrismaClient();
