"use client";
import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Activity } from "lucide-react";
import { api } from "@/lib/api";
import { useSlack } from "@/hooks";

const item = "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50";

/** Dropdown for the account: Slack connect/test/disconnect, live queue dashboard, logout. */
export function AccountMenu({ trigger, align = "left" }: { trigger: (open: boolean) => ReactNode; align?: "left" | "right" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const slack = useSlack();
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left" aria-haspopup="menu" aria-expanded={open}>
        {trigger(open)}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div role="menu" className={`absolute z-40 mt-2 w-60 rounded-xl border border-gray-200 bg-white py-1 shadow-lg ${align === "right" ? "right-0" : "left-0"}`}>
            {slack.status.connected ? (
              <>
                <div className="px-3 py-2 text-xs text-gray-500">Slack: <b>{slack.status.teamName}</b></div>
                <button className={item} onClick={slack.test}>Send Slack test message</button>
                <button className={item} onClick={slack.disconnect}>Disconnect Slack</button>
              </>
            ) : (
              <button className={item} onClick={slack.connect}>Connect Slack</button>
            )}
            <a className={item} href={api.bullBoardUrl} target="_blank" rel="noreferrer"><Activity size={14} /> Live queue dashboard</a>
            <button className={`${item} border-t border-gray-100 text-red-600`} onClick={() => api.logout().finally(() => router.replace("/login"))}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        </>
      )}
    </div>
  );
}
