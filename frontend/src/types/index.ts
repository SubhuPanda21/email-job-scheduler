export type EmailStatus = "SCHEDULED" | "PROCESSING" | "SENT" | "FAILED" | "RATE_LIMITED_REQUEUED";

export interface ScheduledEmail {
  id: string;
  recipient: string;
  subject: string;
  senderEmail: string;
  scheduledAt: string;
  sentAt: string | null;
  status: EmailStatus;
  preview?: string;
  previewUrl?: string | null;
  lastError?: string | null;
}

export interface EmailDetail extends Omit<ScheduledEmail, "preview"> {
  html: string;
}

export type Stats = Partial<Record<EmailStatus, number>>;

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface ScheduleResponse {
  batchId: string;
  scheduled: number;
  duplicate?: boolean;
  duplicatesRemoved?: number;
}

export interface SlackStatus {
  connected: boolean;
  teamName: string | null;
}
