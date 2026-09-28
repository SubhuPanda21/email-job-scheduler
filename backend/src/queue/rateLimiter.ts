import { redisConnection as redis } from "../redis/client";

/**
 * All shared state lives in Redis and every read-modify-write is a Lua script,
 * which Redis executes atomically. That is what makes this correct with N workers
 * x M concurrency, on one machine or many. No in-memory counters anywhere.
 */

const HOUR_MS = 60 * 60 * 1000;
const hourStart = (d: Date) => new Date(Math.floor(d.getTime() / HOUR_MS) * HOUR_MS);
const bucketId = (d: Date) => d.toISOString().slice(0, 13); // e.g. 2026-09-28T14

// Consume one slot ONLY if under the limit (a rejected call never inflates the counter).
const CONSUME_SLOT = `
local c = tonumber(redis.call('GET', KEYS[1]) or '0')
if c >= tonumber(ARGV[1]) then return {0, c} end
c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2])) end
return {1, c}
`;

// Reserve the next send time for a sender: slots are handed out exactly `gap` ms apart,
// no matter how many concurrent jobs ask at once.
const RESERVE_SEND_TIME = `
local now = tonumber(ARGV[1])
local gap = tonumber(ARGV[2])
local nxt = tonumber(redis.call('GET', KEYS[1]) or '0')
local slot = math.max(now, nxt)
redis.call('SET', KEYS[1], tostring(slot + gap), 'PX', (slot - now) + gap + 60000)
return tostring(slot)
`;

export async function tryConsumeSlot(senderEmail: string, limit: number) {
  const now = new Date();
  const key = `ratelimit:${senderEmail}:${bucketId(now)}`;
  const [ok, count] = (await redis.eval(CONSUME_SLOT, 1, key, limit, 3700)) as [number, number];
  return {
    allowed: ok === 1,
    currentCount: count,
    limit,
    resumeAt: new Date(hourStart(now).getTime() + HOUR_MS), // start of next hour window
  };
}

/** Sleeps until this job's reserved send time. Min gap = max(env floor, batch delay). */
export async function waitForSendSlot(senderEmail: string, gapMs: number): Promise<void> {
  const now = Date.now();
  const slot = Number(await redis.eval(RESERVE_SEND_TIME, 1, `nextslot:${senderEmail}`, now, gapMs));
  const wait = slot - now;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

/** Rank inside the next window, so requeued jobs keep their relative order (10ms apart). */
export async function requeueRank(senderEmail: string, resumeAt: Date): Promise<number> {
  const key = `requeue:${senderEmail}:${bucketId(resumeAt)}`;
  const rank = await redis.incr(key);
  if (rank === 1) await redis.expire(key, 2 * 3600);
  return rank;
}

/** True only for the FIRST blocked job of a sender in an hour window -> exactly one Slack alert. */
export async function claimSlackAlert(senderEmail: string): Promise<boolean> {
  const key = `slackalert:${senderEmail}:${bucketId(new Date())}`;
  return (await redis.set(key, "1", "EX", 3700, "NX")) === "OK";
}
