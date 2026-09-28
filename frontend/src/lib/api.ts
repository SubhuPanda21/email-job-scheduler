import { EmailDetail, ScheduleResponse, ScheduledEmail, SlackStatus, Stats, User } from "@/types";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const isForm = opts.body instanceof FormData;
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    credentials: "include",
    headers: isForm ? opts.headers : { "Content-Type": "application/json", ...opts.headers },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(typeof data.error === "string" ? data.error : `Request failed (${res.status})`, res.status);
  }
  return res.json();
}

export const api = {
  me: () => request<User>("/api/auth/me"),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  googleLoginUrl: `${API_BASE}/api/auth/google`,

  slackStatus: () => request<SlackStatus>("/api/slack/status"),
  slackConnectUrl: `${API_BASE}/api/slack/connect`,
  slackDisconnect: () => request("/api/slack/disconnect", { method: "POST" }),
  slackTest: () => request("/api/slack/test", { method: "POST" }),

  config: () => request<{ hourlyLimit: number; delayMs: number; maxBatch: number }>("/api/emails/config"),
  senders: () => request<string[]>("/api/emails/senders"),
  stats: () => request<Stats>("/api/emails/stats"),
  parseLeads: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ count: number; emails: string[] }>("/api/emails/parse-leads", { method: "POST", body: form });
  },
  schedule: (payload: unknown) =>
    request<ScheduleResponse>("/api/emails/schedule", { method: "POST", body: JSON.stringify(payload) }),
  scheduled: () => request<ScheduledEmail[]>("/api/emails/scheduled"),
  sent: () => request<ScheduledEmail[]>("/api/emails/sent"),
  email: (id: string) => request<EmailDetail>(`/api/emails/${id}`),
  search: (q: string) => request<ScheduledEmail[]>(`/api/emails/search?q=${encodeURIComponent(q)}`),
  bullBoardUrl: `${API_BASE}/admin/queues`,
};
