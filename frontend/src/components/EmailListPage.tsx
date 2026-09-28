"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { ScheduledEmail } from "@/types";
import { TopBar } from "./TopBar";
import { EmailList } from "./EmailList";
import { useToast } from "./Toast";

const CONFIG = {
  scheduled: {
    fetch: api.scheduled, emptyTitle: "No scheduled emails",
    emptyHint: "Click Compose to schedule your first campaign.",
    filters: [{ value: "", label: "All" }, { value: "SCHEDULED", label: "Scheduled" }, { value: "PROCESSING", label: "Sending" }, { value: "RATE_LIMITED_REQUEUED", label: "Rate limited" }],
  },
  sent: {
    fetch: api.sent, emptyTitle: "Nothing sent yet",
    emptyHint: "Sent emails appear here as the worker delivers them.",
    filters: [{ value: "", label: "All" }, { value: "SENT", label: "Sent" }, { value: "FAILED", label: "Failed" }],
  },
} as const;

/** Shared by /dashboard/scheduled and /dashboard/sent: loading, empty, polling, search, filter. */
export function EmailListPage({ kind }: { kind: "scheduled" | "sent" }) {
  const cfg = CONFIG[kind];
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<ScheduledEmail[]>([]);
  const [loading, setLoading] = useState(true); // first load only, so polling never flickers
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ScheduledEmail[] | null>(null);
  const [filter, setFilter] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      setRows(await cfg.fetch());
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) router.replace("/login");
      else if (manual) toast.push("error", e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cfg, router, toast]);

  useEffect(() => {
    load();
    const t = setInterval(() => load(), 5000);
    return () => clearInterval(t);
  }, [load]);

  function onQuery(v: string) {
    setQuery(v);
    clearTimeout(timer.current);
    if (!v.trim()) return setResults(null);
    timer.current = setTimeout(() => api.search(v).then(setResults).catch((e) => toast.push("error", e.message)), 300);
  }

  const searching = results !== null;
  const base = searching ? results! : rows;
  const shown = filter ? base.filter((r) => r.status === filter) : base;

  return (
    <>
      <TopBar query={query} onQuery={onQuery} onRefresh={() => load(true)} refreshing={refreshing} filter={filter} onFilter={setFilter} filterOptions={[...cfg.filters]} />
      <main className="flex-1">
        {searching && <p className="px-6 pt-4 text-xs text-gray-400">{shown.length} search result{shown.length === 1 ? "" : "s"}</p>}
        <EmailList
          rows={shown} loading={loading && !searching}
          emptyTitle={searching ? "No matches" : cfg.emptyTitle}
          emptyHint={searching ? "Try a different keyword." : cfg.emptyHint}
          onOpen={(id) => router.push(`/dashboard/email/${id}`)}
        />
      </main>
    </>
  );
}
