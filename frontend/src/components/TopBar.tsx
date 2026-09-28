"use client";
import Link from "next/link";
import { useState } from "react";
import { ListFilter, RefreshCw, Search } from "lucide-react";
import { useUser } from "./UserProvider";
import { Avatar } from "./Avatar";
import { AccountMenu } from "./AccountMenu";

interface Props {
  query: string;
  onQuery: (v: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
  filter: string;
  onFilter: (v: string) => void;
  filterOptions: { value: string; label: string }[];
}

export function TopBar({ query, onQuery, onRefresh, refreshing, filter, onFilter, filterOptions }: Props) {
  const user = useUser();
  const [filterOpen, setFilterOpen] = useState(false);
  return (
    <header className="border-b border-gray-100 px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-3xl">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search emails"
            className="w-full rounded-lg bg-gray-100 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="relative">
          <button onClick={() => setFilterOpen((o) => !o)} aria-label="Filter by status" className={`p-2 rounded-lg hover:bg-gray-100 ${filter ? "text-brand-600" : "text-gray-500"}`}>
            <ListFilter size={16} />
          </button>
          {filterOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setFilterOpen(false)} />
              <div className="absolute right-0 z-40 mt-1 w-40 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                {filterOptions.map((o) => (
                  <button key={o.value} onClick={() => { onFilter(o.value); setFilterOpen(false); }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${filter === o.value ? "font-medium text-brand-600" : ""}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button onClick={onRefresh} aria-label="Refresh" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
        </button>

        {/* Brief: header shows the signed-in user's name, email and avatar, plus logout. */}
        <div className="ml-auto hidden lg:block w-64">
          <AccountMenu
            align="right"
            trigger={() => (
              <div className="flex items-center gap-2 justify-end">
                <div className="text-right leading-tight min-w-0">
                  <div className="truncate text-sm font-medium">{user.name}</div>
                  <div className="truncate text-[11px] text-gray-500">{user.email}</div>
                </div>
                <Avatar user={user} size={34} />
              </div>
            )}
          />
        </div>
      </div>

      <nav className="mt-3 flex gap-2 md:hidden text-sm">
        <Link href="/dashboard/scheduled" className="rounded-full border px-3 py-1">Scheduled</Link>
        <Link href="/dashboard/sent" className="rounded-full border px-3 py-1">Sent</Link>
        <Link href="/dashboard/compose" className="rounded-full border border-brand-500 px-3 py-1 text-brand-600">Compose</Link>
      </nav>
    </header>
  );
}
