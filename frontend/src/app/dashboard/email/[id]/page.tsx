"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { EmailDetail } from "@/types";
import { fmtFull } from "@/lib/format";
import { useUser } from "@/components/UserProvider";
import { Avatar } from "@/components/Avatar";
import { useToast } from "@/components/Toast";

const wrap = (html: string) =>
  `<!doctype html><meta charset="utf-8"><base target="_blank"><style>body{font:14px/1.6 Inter,system-ui,sans-serif;color:#111;margin:0}blockquote{border-left:3px solid #d1d5db;margin:.5rem 0;padding-left:.75rem;color:#6b7280}</style>${html}`;

export default function EmailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const user = useUser();
  const [email, setEmail] = useState<EmailDetail | null>(null);
  const [height, setHeight] = useState(300);

  useEffect(() => {
    api.email(id).then(setEmail).catch((e) => { toast.push("error", e.message); router.replace("/dashboard/scheduled"); });
  }, [id]); 

  const pending = email && ["SCHEDULED", "PROCESSING", "RATE_LIMITED_REQUEUED"].includes(email.status);
  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
        <button onClick={() => router.back()} aria-label="Back" className="rounded p-1 hover:bg-gray-100"><ArrowLeft size={20} /></button>
        <h1 className="min-w-0 flex-1 truncate text-xl">{email ? email.subject : <span className="inline-block h-5 w-64 animate-pulse rounded bg-gray-200" />}</h1>
        <Avatar user={user} size={32} />
      </header>

      {!email ? (
        <div className="mx-auto max-w-4xl space-y-3 p-8 animate-pulse"><div className="h-10 w-72 rounded bg-gray-100" /><div className="h-40 rounded bg-gray-100" /></div>
      ) : (
        <article className="mx-auto max-w-4xl px-6 py-8">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-medium text-white">{email.senderEmail[0]?.toUpperCase()}</div>
            <div className="min-w-0 flex-1 text-sm">
              <div><b>{email.senderEmail}</b></div>
              <div className="text-xs text-gray-500 flex items-center gap-1">to {email.recipient} <ChevronDown size={11} /></div>
            </div>
            <div className="text-right text-xs text-gray-500">
              <div>{pending ? "Scheduled" : email.status === "SENT" ? "Sent" : "Failed"}: {fmtFull((pending ? email.scheduledAt : email.sentAt ?? email.scheduledAt))}</div>
              <div className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[11px] ${email.status === "FAILED" ? "border-red-300 bg-red-50 text-red-600" : pending ? "border-orange-300 bg-orange-50 text-orange-600" : "border-gray-200 bg-gray-50"}`}>
                {email.status.replace(/_/g, " ").toLowerCase()}
              </div>
            </div>
          </div>

          <iframe
            title="Email body"
            sandbox="allow-same-origin"
            srcDoc={wrap(email.html)}
            style={{ height }}
            className="mt-6 w-full"
            onLoad={(e) => { const d = e.currentTarget.contentDocument; if (d) setHeight(d.documentElement.scrollHeight + 16); }}
          />

          {email.previewUrl && (
            <a href={email.previewUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm text-brand-600 hover:underline">Open Ethereal preview ↗</a>
          )}
          {email.status === "FAILED" && email.lastError && <p className="mt-4 text-sm text-red-600">Error: {email.lastError}</p>}
        </article>
      )}
    </div>
  );
}
