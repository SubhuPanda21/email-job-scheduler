import { Router } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma";
import { env } from "../config/env";

const router = Router();

passport.use(
  new GoogleStrategy(
    {
      clientID: env.google.clientId,
      clientSecret: env.google.clientSecret,
      callbackURL: env.google.callbackUrl,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("Google account has no email"));

        const user = await prisma.user.upsert({
          where: { googleId: profile.id },
          update: { name: profile.displayName, avatarUrl: profile.photos?.[0]?.value },
          create: {
            googleId: profile.id,
            email,
            name: profile.displayName,
            avatarUrl: profile.photos?.[0]?.value,
          },
        });
        done(null, user);
      } catch (err) {
        done(err as Error);
      }
    }
  )
);

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${env.frontendUrl}/login?error=1` }),
  (req, res) => {
    const user = req.user as { id: string };
    const token = jwt.sign({ userId: user.id }, env.jwtSecret, { expiresIn: "7d" });
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.redirect(`${env.frontendUrl}/dashboard`);
  }
);

router.get("/me", async (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    res.json({ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl });
  } catch {
    res.status(401).json({ error: "Not authenticated" });
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

export default router;
