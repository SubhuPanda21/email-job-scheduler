"use client";
import { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "./Button";

const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const tomorrowAt = (h: number) => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(h, 0, 0, 0); return toLocalInput(d); };
const PRESETS = [
  { label: "Tomorrow", value: () => tomorrowAt(9) },
  { label: "Tomorrow, 10:00 AM", value: () => tomorrowAt(10) },
  { label: "Tomorrow, 11:00 AM", value: () => tomorrowAt(11) },
  { label: "Tomorrow, 3:00 PM", value: () => tomorrowAt(15) },
];

export function SendLaterPopover({ value, onApply, onClose }: { value: string; onApply: (v: string) => void; onClose: () => void }) {
  const [pending, setPending] = useState(value);
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div role="dialog" aria-label="Send later" className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-gray-100 bg-white p-4 shadow-xl">
        <h3 className="text-sm font-medium">Send Later</h3>
        <label className="mt-3 flex items-center border-b border-gray-200 pb-1 text-xs text-gray-500">
          <input type="datetime-local" value={pending} onChange={(e) => setPending(e.target.value)} aria-label="Pick date and time" className="w-full bg-transparent focus:outline-none" />
          <Calendar size={13} />
        </label>
        <ul className="mt-3 space-y-1">
          {PRESETS.map((p) => (
            <li key={p.label}>
              <button type="button" onClick={() => setPending(p.value())} className="w-full rounded px-1 py-1.5 text-left text-xs hover:bg-gray-50">{p.label}</button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between">
          {value ? <button type="button" onClick={() => { onApply(""); onClose(); }} className="text-xs text-gray-400 hover:text-gray-700">Clear</button> : <span />}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="text-xs">Cancel</button>
            <Button variant="outline" className="!rounded-full !px-4 !py-1 text-xs" disabled={!pending} onClick={() => { onApply(pending); onClose(); }}>Done</Button>
          </div>
        </div>
      </div>
    </>
  );
}
