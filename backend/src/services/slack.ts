import { prisma } from "../db/prisma";
import { env } from "../config/env";
import jwt from "jsonwebtoken";

export function signSlackState(userId: string): string {
  // Signed + 10 min expiry: prevents forging another user's id in the OAuth callback (CSRF).
  return jwt.sign({ userId, purpose: "slack" }, env.jwtSecret, { expiresIn: "10m" });
}
export function verifySlackState(state: string): string {
  const p = jwt.verify(state, env.jwtSecret) as { userId: string; purpose: string };
  if (p.purpose !== "slack") throw new Error("bad state");
  return p.userId;
}

export function getSlackAuthorizeUrl(state: string): string {
  const q = new URLSearchParams({
    client_id: env.slack.clientId,
    scope: "incoming-webhook",
    redirect_uri: env.slack.redirectUri,
    state,
  });
  return `https://slack.com/oauth/v2/authorize?${q}`;
}

export async function exchangeSlackCode(code: string) {
  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.slack.clientId,
      client_secret: env.slack.clientSecret,
      code,
      redirect_uri: env.slack.redirectUri,
    }),
  });
  const data: any = await res.json();
  if (!data.ok) throw new Error(`Slack OAuth failed: ${data.error}`);
  return {
    accessToken: data.access_token as string,
    webhookUrl: data.incoming_webhook.url as string,
    teamName: data.team.name as string,
  };
}

/** Posts to the user's connected Slack. Looked up fresh from the DB every call, so connecting later works with no redeploy. */
export async function postToSlack(userId: string, text: string): Promise<boolean> {
  const conn = await prisma.slackConnection.findUnique({ where: { userId } });
  if (!conn) return false; // not connected: silently skip, never crash
  try {
    const res = await fetch(conn.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    return res.ok;
  } catch (e) {
    console.error("[slack] post failed:", e);
    return false;
  }
}

export function notifyRateLimitHit(p: { userId: string; senderEmail: string; limit: number; resumeAt: Date }) {
  return postToSlack(
    p.userId,
    `:rotating_light: *Hourly limit reached* for \`${p.senderEmail}\` (${p.limit}/hour).\n` +
      `Remaining emails were rescheduled (not dropped) and resume at *${p.resumeAt.toISOString()}*.`
  );
}
