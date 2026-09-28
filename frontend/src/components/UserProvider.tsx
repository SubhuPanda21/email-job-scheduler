"use client";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { User } from "@/types";

const UserContext = createContext<User | null>(null);

export function useUser(): User {
  const u = useContext(UserContext);
  if (!u) throw new Error("useUser must be used inside <UserProvider>");
  return u;
}

/** Auth gate: real session check against the API; unauthenticated visitors go to /login. */
export function UserProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    api.me().then(setUser).catch(() => router.replace("/login"));
  }, [router]);
  if (!user) return <div className="min-h-screen flex items-center justify-center text-gray-400 animate-pulse">Loading…</div>;
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}
