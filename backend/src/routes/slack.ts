import { Router } from "express";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { getSlackAuthorizeUrl, exchangeSlackCode, signSlackState, verifySlackState, postToSlack } from "../services/slack";
import { prisma } from "../db/prisma";
import { env } from "../config/env";

const router = Router();

router.get("/connect", requireAuth, (req: AuthedRequest, res) => {
  res.redirect(getSlackAuthorizeUrl(signSlackState(req.userId!)));
});

router.get("/callback", async (req, res) => {
  try {
    const { code, state } = req.query as { code: string; state: string };
    const userId = verifySlackState(state);
    const { accessToken, webhookUrl, teamName } = await exchangeSlackCode(code);
    await prisma.slackConnection.upsert({
      where: { userId },
      update: { accessToken, webhookUrl, teamName },
      create: { userId, accessToken, webhookUrl, teamName },
    });
    await postToSlack(userId, ":white_check_mark: ReachInbox Scheduler is connected. You'll be alerted here when a sender hits its hourly limit.");
    res.redirect(`${env.frontendUrl}/dashboard/scheduled?slack=connected`);
  } catch (err) {
    console.error("[slack] callback failed:", err);
    res.redirect(`${env.frontendUrl}/dashboard/scheduled?slack=error`);
  }
});

router.post("/disconnect", requireAuth, async (req: AuthedRequest, res) => {
  await prisma.slackConnection.deleteMany({ where: { userId: req.userId } });
  res.json({ ok: true });
});

router.post("/test", requireAuth, async (req: AuthedRequest, res) => {
  const ok = await postToSlack(req.userId!, ":test_tube: Test message from ReachInbox Scheduler.");
  res.status(ok ? 200 : 400).json({ ok });
});

router.get("/status", requireAuth, async (req: AuthedRequest, res) => {
  const conn = await prisma.slackConnection.findUnique({ where: { userId: req.userId } });
  res.json({ connected: !!conn, teamName: conn?.teamName ?? null });
});

export default router;
