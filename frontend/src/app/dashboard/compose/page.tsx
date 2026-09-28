"use client";
import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { EMAIL_RE, fmtFull, stripHtml, uuid } from "@/lib/format";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { RichTextEditor } from "@/components/RichTextEditor";
import { RecipientInput } from "@/components/RecipientInput";
import { SendLaterPopover } from "@/components/SendLaterPopover";
import { useToast } from "@/components/Toast";

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid grid-cols-[88px_1fr] items-center gap-2 text-sm">
    <span className="text-xs">{label}</span>
    <div>{children}</div>
  </div>
);
const smallInput = "w-14 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-center placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500";

export default function ComposePage() {
  const router = useRouter();
  const toast = useToast();
  const [idempotencyKey] = useState(uuid); // double-click / retry safe
  const [senders, setSenders] = useState<string[]>([]);
  const [from, setFrom] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [detected, setDetected] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [delay, setDelay] = useState("");
  const [hourly, setHourly] = useState("");
  const [startTime, setStartTime] = useState(""); // "" = send now
  const [laterOpen, setLaterOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.config().then((c) => { setHourly(String(c.hourlyLimit)); setDelay(String(c.delayMs / 1000)); }).catch(() => undefined);
    api.senders().then((s) => { setSenders(s); setFrom(s[0] ?? ""); }).catch(() => toast.push("error", "Could not load senders"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUpload(file: File) {
    try {
      const r = await api.parseLeads(file);
      setEmails((prev) => [...new Set([...prev, ...r.emails])]);
      setDetected(r.count);
      if (r.count === 0) toast.push("error", "No valid email addresses found in that file");
    } catch (e) {
      toast.push("error", e instanceof Error ? e.message : "Could not read file");
    }
  }

  function validate(): string | null {
    if (!from) return "Choose a sender";
    if (emails.length === 0) return "Add at least one recipient (type addresses or Upload List)";
    if (!emails.every((e) => EMAIL_RE.test(e))) return "One or more recipient addresses are invalid";
    if (!subject.trim()) return "Subject is required";
    if (!stripHtml(html)) return "Write a message body";
    if (!(Number(hourly) >= 1)) return "Hourly limit must be at least 1";
    if (!(Number(delay) >= 0) || delay === "") return "Delay must be 0 or more seconds";
    return null;
  }

  function onSend() {
    const err = validate();
    if (err) return toast.push("error", err);
    setConfirmOpen(true);
  }

  async function schedule() {
    setSubmitting(true);
    try {
      const r = await api.schedule({
        subject, body: html, senderEmail: from, emails,
        hourlyLimit: Number(hourly), delayMs: Math.round(Number(delay) * 1000),
        startTime: (startTime ? new Date(startTime) : new Date()).toISOString(),
        idempotencyKey,
      });
      toast.push("success", `Scheduled ${r.scheduled} emails`);
      router.push("/dashboard/scheduled");
    } catch (e) {
      toast.push("error", e instanceof Error ? e.message : "Failed to schedule");
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  const windows = Math.max(Math.ceil(emails.length / Math.max(Number(hourly) || 1, 1)), 1);

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center gap-3 px-6 pt-6">
        <button onClick={() => router.push("/dashboard/scheduled")} aria-label="Back" className="rounded p-1 hover:bg-gray-100"><ArrowLeft size={20} /></button>
        <h1 className="text-xl">Compose New Email</h1>
        <div className="relative ml-auto flex items-center gap-3">
          <button onClick={() => setLaterOpen((o) => !o)} aria-label="Send later" className={`rounded p-1 hover:bg-gray-100 ${startTime ? "text-brand-600" : "text-gray-400"}`}>
            <Clock size={18} />
          </button>
          <Button variant="outline" className="!rounded-full !px-4 !py-1 text-xs" onClick={onSend}>{startTime ? "Send Later" : "Send"}</Button>
          {laterOpen && <SendLaterPopover value={startTime} onApply={setStartTime} onClose={() => setLaterOpen(false)} />}
        </div>
      </header>

      <div className="mx-auto mt-10 max-w-4xl space-y-5 px-6 pb-16">
        <Row label="From">
          <div className="relative inline-block">
            <select value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From"
              className="appearance-none rounded-lg bg-gray-100 py-1.5 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              {senders.length === 0 && <option value="">No senders configured</option>}
              {senders.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </Row>

        <Row label="To">
          <RecipientInput emails={emails} onChange={setEmails} onUpload={handleUpload} />
          {emails.length > 0 && (
            <p className="mt-1 text-xs text-brand-600">
              {emails.length} email address{emails.length === 1 ? "" : "es"} detected
              {detected !== null && ` (${detected} from the uploaded file)`}
            </p>
          )}
        </Row>

        <Row label="Subject">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" aria-label="Subject"
            className="w-full border-b border-gray-200 pb-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none" />
        </Row>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-2">Delay between 2 emails (sec)
            <input type="number" min={0} step={0.5} value={delay} onChange={(e) => setDelay(e.target.value)} placeholder="00" className={smallInput} />
          </label>
          <label className="flex items-center gap-2 sm:ml-2">Hourly Limit
            <input type="number" min={1} value={hourly} onChange={(e) => setHourly(e.target.value)} placeholder="00" className={smallInput} />
          </label>
          {startTime && <span className="ml-2 text-brand-600">Starts {fmtFull(new Date(startTime).toISOString())}</span>}
        </div>

        <RichTextEditor onChange={setHtml} />
        <p className="text-xs text-gray-400">Tip: type {"{{email}}"} in the subject or body to personalise each message.</p>
      </div>

      {confirmOpen && (
        <Modal
          title="Schedule this campaign?"
          onClose={() => !submitting && setConfirmOpen(false)}
          footer={
            <>
              <Button variant="secondary" disabled={submitting} onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button disabled={submitting} onClick={schedule}>{submitting ? "Scheduling…" : "Schedule"}</Button>
            </>
          }
        >
          <dl className="grid grid-cols-[130px_1fr] gap-y-2 text-sm">
            <dt className="text-gray-500">Recipients</dt><dd>{emails.length}</dd>
            <dt className="text-gray-500">From</dt><dd>{from}</dd>
            <dt className="text-gray-500">Start</dt><dd>{startTime ? fmtFull(new Date(startTime).toISOString()) : "Immediately"}</dd>
            <dt className="text-gray-500">Delay</dt><dd>{delay}s between emails</dd>
            <dt className="text-gray-500">Hourly limit</dt><dd>{hourly}/hour{windows > 1 ? ` (≈ ${windows} hour windows)` : ""}</dd>
          </dl>
        </Modal>
      )}
    </div>
  );
}
