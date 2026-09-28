import "dotenv/config";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  frontendUrl: required("FRONTEND_URL", "http://localhost:3000"),
  sessionSecret: required("SESSION_SECRET", "dev-secret"),
  jwtSecret: required("JWT_SECRET", "dev-jwt-secret"),

  databaseUrl: required("DATABASE_URL"),
  redisUrl: required("REDIS_URL", "redis://localhost:6379"),

  esUrl: required("ELASTICSEARCH_URL", "http://localhost:9200"),
  esIndex: required("ELASTICSEARCH_INDEX", "emails"),

  smtpHost: required("ETHEREAL_SMTP_HOST", "smtp.ethereal.email"),
  smtpPort: Number(process.env.ETHEREAL_SMTP_PORT ?? 587),
 
  etherealSenders: (process.env.ETHEREAL_SENDERS ?? "")
    .split(",")
    .filter(Boolean)
    .map((pair) => {
      const [user, pass] = pair.split(":");
      return { user, pass };
    }),

  workerConcurrency: Number(process.env.WORKER_CONCURRENCY ?? 5),
  minDelayMsBetweenSends: Number(process.env.MIN_DELAY_MS_BETWEEN_SENDS ?? 2000),
  maxEmailsPerHourPerSender: Number(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER ?? 100),

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    callbackUrl: process.env.GOOGLE_CALLBACK_URL ?? "http://localhost:4000/api/auth/google/callback",
  },
  slack: {
    clientId: process.env.SLACK_CLIENT_ID ?? "",
    clientSecret: process.env.SLACK_CLIENT_SECRET ?? "",
    redirectUri: process.env.SLACK_REDIRECT_URI ?? "http://localhost:4000/api/slack/callback",
  },
};
