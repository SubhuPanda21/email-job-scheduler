import nodemailer from "nodemailer";
import { env } from "../config/env";

const transporters = new Map<string, nodemailer.Transporter>();

export const listSenders = () => env.etherealSenders.map((s) => s.user);

function getTransporter(senderEmail: string) {
  const cached = transporters.get(senderEmail);
  if (cached) return cached;
  const creds = env.etherealSenders.find((s) => s.user === senderEmail);
  if (!creds) throw new Error(`No Ethereal credentials for sender ${senderEmail}. Add it to ETHEREAL_SENDERS.`);
  const t = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: false,
    auth: { user: creds.user, pass: creds.pass },
  });
  transporters.set(senderEmail, t);
  return t;
}

export async function sendEmail(p: { senderEmail: string; to: string; subject: string; html: string }) {
  const info = await getTransporter(p.senderEmail).sendMail({
    from: p.senderEmail,
    to: p.to,
    subject: p.subject,
    html: p.html,
  });
  return { messageId: info.messageId, previewUrl: nodemailer.getTestMessageUrl(info) || "" };
}
