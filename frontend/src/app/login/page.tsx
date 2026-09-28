"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.5 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.2 5.5-4.7 7.2l7.6 5.9c4.4-4.1 6.9-10.2 6.9-17.6z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.500-.8-3.100-.8-4.700s.3-3.200.8-4.700l-7.900-6.100C.9 16.400 0 20.100 0 24s.9 7.600 2.600 10.800l7.900-6.100z" />
      <path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.600-5.900c-2.100 1.400-4.900 2.300-8.300 2.300-6.300 0-11.600-4-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z" />
    </svg>
  );
}

const field = "w-full rounded-lg bg-gray-100 px-4 py-3.5 text-sm placeholder:text-gray-500 disabled:cursor-not-allowed";

export default function LoginPage() {
  const router = useRouter();
  useEffect(() => { api.me().then(() => router.replace("/dashboard")).catch(() => undefined); }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-[400px] rounded-xl border border-gray-200 px-8 py-12">
        <h1 className="text-center text-3xl font-semibold">Login</h1>
        <a
          href={api.googleLoginUrl}
          className="mt-8 flex items-center justify-center gap-2 rounded-lg bg-brand-50 py-3 text-sm font-medium hover:bg-brand-100 transition"
        >
          <GoogleG /> Login with Google
        </a>
        <div className="my-6 flex items-center gap-3 text-xs text-gray-400">
          <span className="h-px flex-1 bg-gray-200" /> or sign up through email <span className="h-px flex-1 bg-gray-200" />
        </div>
        {/* Shown to match the Figma; this build authenticates with Google only (see README). */}
        <div className="space-y-3" title="Email sign-in is not enabled in this build. Please use Google.">
          <input disabled className={field} placeholder="Email ID" aria-label="Email ID" />
          <input disabled type="password" className={field} placeholder="Password" aria-label="Password" />
          <button disabled className="w-full rounded-lg bg-brand-500 py-3 text-sm font-medium text-white opacity-60 cursor-not-allowed mt-3">Login</button>
        </div>
        <p className="mt-4 text-center text-xs text-gray-400">Email sign-in is disabled in this build. Please use Google.</p>
      </div>
    </main>
  );
}
