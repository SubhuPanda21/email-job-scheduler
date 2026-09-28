"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Sidebar";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState({ scheduled: 0, sent: 0 });
  useEffect(() => {
    const load = () =>
      api.stats().then((s) =>
        setCounts({
          scheduled: (s.SCHEDULED ?? 0) + (s.PROCESSING ?? 0) + (s.RATE_LIMITED_REQUEUED ?? 0),
          sent: (s.SENT ?? 0) + (s.FAILED ?? 0),
        })
      ).catch(() => undefined);
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="min-h-screen flex">
      <Sidebar counts={counts} />
      <div className="flex-1 min-w-0 flex flex-col">{children}</div>
    </div>
  );
}
