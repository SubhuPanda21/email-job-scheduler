import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import passport from "passport";
import { env } from "./config/env";
import authRoutes from "./routes/auth";
import emailRoutes from "./routes/emails";
import slackRoutes from "./routes/slack";
import { mountBullBoard } from "./bullBoard";
import { requireAuth } from "./middleware/auth";
import { ensureIndex } from "./services/search";

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(passport.initialize());

app.use("/api/auth", authRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/slack", slackRoutes);
app.use("/admin/queues", requireAuth, mountBullBoard());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

async function start() {
  for (let i = 0; i < 5; i++) {
    try { await ensureIndex(); break; } catch (e: any) {
      console.warn(`[es] index setup attempt ${i + 1} failed: ${e.message}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  app.listen(env.port, () => {
    console.log(`API on :${env.port}  |  Bull Board: http://localhost:${env.port}/admin/queues`);
  });
}
start();
