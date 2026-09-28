import IORedis from "ioredis";
import { env } from "../config/env";

// maxRetriesPerRequest: null is required by BullMQ's blocking connections.
export const redisConnection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
});
