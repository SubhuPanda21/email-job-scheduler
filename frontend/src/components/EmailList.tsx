"use client";
import { useState } from "react";
import { Clock, Star } from "lucide-react";
import { ScheduledEmail, EmailStatus } from "@/types";
import { fmtFull, fmtPill } from "@/lib/format";

const LABEL: Record<EmailStatus, string> = {
  SCHEDULED: "Scheduled", PROCESSING: "Sending", SENT: "Sent", FAILED: "Failed", RATE_LIMITED_REQUEUED: "Rate limited",
};
const PENDING: EmailStatus[] = ["SCHEDULED", "PROCESSING", "RATE_LIMITED_REQUEUED"];
const pill = "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] whitespace-nowrap";

function StatusPill({ row }: { row: ScheduledEmail }) {
  if (PENDING.includes(row.status)) {
    const tone = row.status === "RATE_LIMITED_REQUEUED" ? "border-purple-300 bg-purple-50 text-purple-700" : "border-orange-300 bg-orange-50 text-orange-600";
    return <span className={`${pill} ${tone}`}><Clock size={11} />{fmtPill(row.scheduledAt)}</span>;
  }
  const tone = row.status === "FAILED" ? "border-red-300 bg-red-50 text-red-600" : "border-gray-200 bg-gray-50 text-gray-600";
  return <span className={`${pill} ${tone}`}>{LABEL[row.status]}</span>;
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 7 }).map((_, i) => (
        <li key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
          <div className="h-3 w-32 rounded bg-gray-200" /><div className="h-5 w-24 rounded-full bg-gray-200" /><div className="h-3 flex-1 rounded bg-gray-100" />
        </li>
      ))}
    </>
  );
}

interface Props {
  rows: ScheduledEmail[];
  loading: boolean;
  emptyTitle: string;
  emptyHint?: string;
  onOpen: (id: string) => void;
}

/** Figma list row: To | time/status pill | subject - status - preview | star. */
export function EmailList({ rows, loading, emptyTitle, emptyHint, onOpen }: Props) {
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const toggleStar = (id: string) => setStarred((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (!loading && rows.length === 0) {
    return (
      <div className="m-6 rounded-xl border border-dashed border-gray-300 py-20 text-center">
        <div className="text-3xl mb-2">📭</div>
        <p className="font-medium text-gray-700">{emptyTitle}</p>
        {emptyHint && <p className="mt-1 text-sm text-gray-400">{emptyHint}</p>}
      </div>
    );
  }
  return (
    <ul className="divide-y divide-gray-100" aria-busy={loading}>
      {loading ? <SkeletonRows /> : rows.map((r) => (
        <li
          key={r.id}
          role="link" tabIndex={0}
          onClick={() => onOpen(r.id)}
          onKeyDown={(e) => e.key === "Enter" && onOpen(r.id)}
          className="flex cursor-pointer items-center gap-4 px-6 py-3.5 text-sm hover:bg-gray-50"
        >
          <span className="w-40 shrink-0 truncate">To: {r.recipient}</span>
          <StatusPill row={r} />
          <span className="min-w-0 flex-1 truncate">
            <b className="font-medium">{r.subject}</b>
            {PENDING.includes(r.status) && <span> - {LABEL[r.status]}</span>}
            {r.preview && <span className="text-gray-400"> - {r.preview}</span>}
          </span>
          {r.sentAt && <span className="hidden sm:block shrink-0 text-xs text-gray-400">{fmtFull(r.sentAt)}</span>}
          <button onClick={(e) => { e.stopPropagation(); toggleStar(r.id); }} aria-label="Star" className="text-gray-300 hover:text-amber-400">
            <Star size={15} className={starred.has(r.id) ? "fill-amber-400 text-amber-400" : ""} />
          </button>
        </li>
      ))}
    </ul>
  );
}
