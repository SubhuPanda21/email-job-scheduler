"use client";
import { Button } from "@/components/Button";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <p className="text-gray-600">Something went wrong.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
