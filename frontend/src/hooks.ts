"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { SlackStatus } from "@/types";
import { useToast } from "@/components/Toast";

/** Shared Slack connection state + actions (used by the sidebar and the account menu). */
export function useSlack() {
  const toast = useToast();
  const [status, setStatus] = useState<SlackStatus>({ connected: false, teamName: null });
  useEffect(() => { api.slackStatus().then(setStatus).catch(() => undefined); }, []);
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("slack");
    if (s === "connected") toast.push("success", "Slack connected");
    if (s === "error") toast.push("error", "Slack connection failed");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const connect = useCallback(() => { window.location.href = api.slackConnectUrl; }, []);
  const disconnect = useCallback(async () => {
    await api.slackDisconnect();
    setStatus({ connected: false, teamName: null });
    toast.push("info", "Slack disconnected");
  }, [toast]);
  const test = useCallback(async () => {
    try { await api.slackTest(); toast.push("success", "Test message sent to Slack"); }
    catch { toast.push("error", "Slack test failed"); }
  }, [toast]);
  return { status, connect, disconnect, test };
}
