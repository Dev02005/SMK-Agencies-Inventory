import { WifiOff } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline", robots: { index: false, follow: false } };

/** Shown by the service worker when the app is opened with no signal. Works without any script. */
export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10 text-center">
      <div className="max-w-sm">
        <span className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-hairline text-ink-secondary">
          <WifiOff size={28} strokeWidth={1.75} aria-hidden />
        </span>
        <h1 className="text-[28px] font-semibold tracking-[-0.4px] text-ink">You&apos;re offline</h1>
        <p className="mt-2 text-[15px] leading-[22px] text-ink-secondary">
          SKA needs the internet to show today&apos;s sales, money and stock. Check your mobile data or Wi-Fi, then try again.
        </p>
        {/* A plain form reloads this address, so the button works even before any script has loaded. */}
        <form className="mt-6">
          <button type="submit" className="h-11 rounded-full bg-accent px-6 text-[17px] font-medium text-white">
            Try again
          </button>
        </form>
      </div>
    </main>
  );
}
