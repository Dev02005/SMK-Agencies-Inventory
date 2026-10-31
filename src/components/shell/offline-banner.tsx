"use client";

import { WifiOff } from "lucide-react";
import { useOffline } from "next/offline";

/** Shown while the connection is down; Next.js retries the waiting page loads and saves once it is back. */
export function OfflineBanner() {
  const offline = useOffline();
  if (!offline) return null;
  return (
    <div role="status" className="border-b border-warning/20 bg-warning-soft print:hidden">
      <p className="mx-auto flex max-w-[1200px] items-center gap-2 px-4 py-2 text-[13px] text-warning md:px-8">
        <WifiOff size={15} strokeWidth={2} aria-hidden />
        You&apos;re offline. Anything you open or save will go through as soon as the connection is back.
      </p>
    </div>
  );
}
