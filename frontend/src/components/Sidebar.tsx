"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Clock, Send } from "lucide-react";
import { useUser } from "./UserProvider";
import { Avatar } from "./Avatar";
import { AccountMenu } from "./AccountMenu";
import { useSlack } from "@/hooks";

function NavItem({ href, icon, label, count, active }: { href: string; icon: React.ReactNode; label: string; count: number; active: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${active ? "bg-brand-50 font-medium" : "text-gray-700 hover:bg-gray-50"}`}>
      {icon}<span className="flex-1">{label}</span><span className="text-xs text-gray-400">{count}</span>
    </Link>
  );
}

export function Sidebar({ counts }: { counts: { scheduled: number; sent: number } }) {
  const user = useUser();
  const path = usePathname();
  const slack = useSlack();
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col gap-4 border-r border-gray-100 p-4">
      <div className="font-pixel text-4xl leading-none tracking-tight">ONB</div>

      <AccountMenu
        trigger={() => (
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-2.5">
            <Avatar user={user} size={32} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium leading-tight">{user.name}</div>
              <div className="truncate text-[10px] text-gray-500">{user.email}</div>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </div>
        )}
      />

      <Link href="/dashboard/compose" className="rounded-full border border-brand-500 py-1.5 text-center text-sm text-brand-600 hover:bg-brand-50 transition">
        Compose
      </Link>

      <div>
        <div className="mb-1 px-3 text-[10px] uppercase tracking-wider text-gray-400">Core</div>
        <nav className="space-y-1">
          <NavItem href="/dashboard/scheduled" icon={<Clock size={15} />} label="Scheduled" count={counts.scheduled} active={path.endsWith("/scheduled")} />
          <NavItem href="/dashboard/sent" icon={<Send size={15} />} label="Sent" count={counts.sent} active={path.endsWith("/sent")} />
        </nav>
      </div>

      {!slack.status.connected && (
        <button onClick={slack.connect} className="mt-auto rounded-lg border border-gray-200 py-2 text-xs text-gray-600 hover:bg-gray-50">
          Connect Slack for rate-limit alerts
        </button>
      )}
    </aside>
  );
}
