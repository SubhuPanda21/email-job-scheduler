"use client";
import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { EMAIL_RE } from "@/lib/format";

interface Props {
  emails: string[];
  onChange: (emails: string[]) => void;
  onUpload: (file: File) => void;
}

export function RecipientInput({ emails, onChange, onUpload }: Props) {
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function commit(raw: string) {
    const found = raw.split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter((s) => EMAIL_RE.test(s));
    if (found.length) onChange([...new Set([...emails, ...found])]);
    setDraft("");
  }
  const visible = expanded ? emails : emails.slice(0, 3);
  const hidden = emails.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2 min-h-[38px]">
      {visible.map((e) => (
        <span key={e} className="inline-flex items-center gap-1 rounded-full border border-brand-500 bg-brand-50 px-2 py-0.5 text-xs">
          {e}
          <button type="button" aria-label={`Remove ${e}`} onClick={() => onChange(emails.filter((x) => x !== e))} className="text-gray-400 hover:text-gray-700"><X size={11} /></button>
        </span>
      ))}
      {hidden > 0 && (
        <button type="button" onClick={() => setExpanded(true)} className="rounded-full border border-brand-500 bg-brand-50 px-2 py-0.5 text-xs">+{hidden}</button>
      )}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (["Enter", ",", " "].includes(e.key) && draft.trim()) { e.preventDefault(); commit(draft); } }}
        onBlur={() => draft.trim() && commit(draft)}
        placeholder={emails.length ? "" : "recipient@example.com"}
        aria-label="Recipients"
        className="min-w-[140px] flex-1 bg-transparent text-sm placeholder:text-gray-400 focus:outline-none"
      />
      <button type="button" onClick={() => fileRef.current?.click()} className="ml-auto inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
        <Upload size={14} /> Upload List
      </button>
      <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
    </div>
  );
}
