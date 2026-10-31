"use client";

import { Share, SquarePlus, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { promptInstall, rememberDismissed, useInstall, wasDismissedRecently } from "@/lib/install";

/**
 * A small card offering to install SKA like an app (home-screen icon, full screen, no browser bar).
 * Shows a few seconds after opening, never once installed, and stays away for 30 days after "Not now".
 */
export function InstallPrompt() {
  const install = useInstall();
  const [ready, setReady] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (wasDismissedRecently()) return;
    const timer = window.setTimeout(() => setReady(true), 4000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready || closed || install.kind === "installed" || install.kind === "none") return null;

  const close = () => {
    rememberDismissed();
    setClosed(true);
  };

  return (
    <section
      aria-labelledby="install-title"
      className="surface animate-fade-up fixed inset-x-4 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md p-4 shadow-raised md:inset-x-auto md:bottom-6 md:right-6 md:w-[360px] print:hidden"
    >
      <div className="flex items-start gap-3">
        <Image src="/icon.svg" alt="" width={44} height={44} unoptimized className="shrink-0 rounded-[10px]" />
        <div className="min-w-0 flex-1">
          <h2 id="install-title" className="text-[15px] font-semibold text-ink">
            Install SKA on this {install.kind === "ios" ? install.device : install.kind === "mac-safari" ? "Mac" : "device"}
          </h2>
          <p className="mt-0.5 text-[13px] leading-[19px] text-ink-secondary">
            {install.kind === "ios" ? (
              <>
                Tap <Share size={14} strokeWidth={2} className="inline -translate-y-px text-accent" aria-label="Share" />, then{" "}
                <span className="whitespace-nowrap">
                  <SquarePlus size={14} strokeWidth={2} className="inline -translate-y-px" aria-hidden /> Add to Home Screen
                </span>
                .
              </>
            ) : install.kind === "mac-safari" ? (
              <>In Safari&apos;s menu bar choose File → Add to Dock. It then opens from the Dock like any other app.</>
            ) : install.kind === "android-menu" ? (
              <>Open the browser menu (⋮) and choose Install. It then opens from your home screen like any other app.</>
            ) : (
              <>Opens from your home screen, Start menu or Dock, full screen, like any other app.</>
            )}
          </p>
        </div>
        <button type="button" onClick={close} aria-label="Close" className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-full text-ink-tertiary hover:bg-hairline hover:text-ink">
          <X size={18} strokeWidth={2} aria-hidden />
        </button>
      </div>
      {install.kind === "prompt" && (
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="plain" className="px-3" onClick={close}>
            Not now
          </Button>
          <Button
            className="h-10 px-5 text-[15px]"
            onClick={async () => {
              if (!(await promptInstall())) rememberDismissed();
              setClosed(true);
            }}
          >
            Install
          </Button>
        </div>
      )}
    </section>
  );
}
