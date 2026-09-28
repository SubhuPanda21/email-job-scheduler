import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

// Integration tests need a real Redis: REDIS_URL=redis://localhost:6379 npm test
process.env.DATABASE_URL ??= "postgresql://x:x@localhost/x";
const url = process.env.REDIS_URL ?? "redis://localhost:6379";
const run = process.env.REDIS_URL || process.env.CI ? describe : describe.skip;

run("redis-backed limiter + BullMQ persistence", () => {
  let limiter: typeof import("../src/queue/rateLimiter");
  let conn: IORedis;
  beforeAll(async () => {
    process.env.REDIS_URL = url;
    limiter = await import("../src/queue/rateLimiter");
    conn = new IORedis(url, { maxRetriesPerRequest: null });
    await conn.flushall();
  });
  afterAll(async () => { await conn.quit(); (await import("../src/redis/client")).redisConnection.disconnect(); });

  it("allows exactly `limit` sends per hour under 50 parallel calls, and never inflates the counter", async () => {
    const results = await Promise.all(Array.from({ length: 50 }, () => limiter.tryConsumeSlot("a@x.com", 10)));
    expect(results.filter((r) => r.allowed).length).toBe(10);
    const [key] = await conn.keys("ratelimit:a@x.com:*");
    expect(Number(await conn.get(key))).toBe(10); // 40 rejected calls did not inflate it
    expect(results[0].resumeAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("limits are independent per sender", async () => {
    expect((await limiter.tryConsumeSlot("b@x.com", 1)).allowed).toBe(true);
    expect((await limiter.tryConsumeSlot("c@x.com", 1)).allowed).toBe(true);
    expect((await limiter.tryConsumeSlot("b@x.com", 1)).allowed).toBe(false);
  });

  it("spaces 5 concurrent sends at least `gap` ms apart", async () => {
    const t0 = Date.now();
    const stamps: number[] = [];
    await Promise.all(Array.from({ length: 5 }, async () => { await limiter.waitForSendSlot("d@x.com", 200); stamps.push(Date.now() - t0); }));
    stamps.sort((a, b) => a - b);
    for (let i = 1; i < stamps.length; i++) expect(stamps[i] - stamps[i - 1]).toBeGreaterThanOrEqual(190);
  });

  it("fires the Slack alert claim once per sender per hour", async () => {
    const claims = await Promise.all(Array.from({ length: 20 }, () => limiter.claimSlackAlert("e@x.com")));
    expect(claims.filter(Boolean).length).toBe(1);
  });

  it("a delayed job survives a worker restart and runs exactly once", async () => {
    const q = new Queue("persist-test", { connection: conn });
    await q.add("j", { n: 1 }, { jobId: "job-1", delay: 1500 });
    await q.add("j", { n: 1 }, { jobId: "job-1", delay: 1500 }); // duplicate jobId ignored (idempotent enqueue)

    // "Server 1" starts and is killed before the job is due
    const w1 = new Worker("persist-test", async () => { throw new Error("should not run yet"); }, { connection: new IORedis(url, { maxRetriesPerRequest: null }) });
    await w1.close(); // simulated crash/restart

    let runs = 0;
    const done = new Promise<void>((resolve) => {
      const w2 = new Worker("persist-test", async () => { runs++; }, { connection: new IORedis(url, { maxRetriesPerRequest: null }) });
      w2.on("completed", async () => { await new Promise((r) => setTimeout(r, 500)); await w2.close(); resolve(); });
    });
    await done;
    expect(runs).toBe(1);
  }, 15000);
});
