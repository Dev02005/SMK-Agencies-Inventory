"use client";

import { Check, Download, Share, SquarePlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { promptInstall, useInstall } from "@/lib/install";

/** Settings › Install app: the browser's own install button where there is one, otherwise how to add it by hand. */
export function InstallRow() {
  const install = useInstall();
  const [open, setOpen] = useState(false);
  const installed = install.kind === "installed";

  const how =
    install.kind === "ios" ? (
      <>
        Tap <Share size={14} strokeWidth={2} className="inline -translate-y-px text-accent" aria-label="Share" /> in Safari, then{" "}
        <span className="whitespace-nowrap">
          <SquarePlus size={14} strokeWidth={2} className="inline -translate-y-px" aria-hidden /> Add to Home Screen
        </span>
        .
      </>
    ) : install.kind === "mac-safari" ? (
      <>In Safari&apos;s menu bar choose File → Add to Dock.</>
    ) : install.kind === "android-menu" ? (
      <>Open the browser menu (⋮) and choose Install.</>
    ) : (
      <>Open SKA in Chrome or Edge, then choose Install from the browser menu (⋮) or the install icon in the address bar.</>
    );

  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-good-soft text-good">
          {installed ? <Check size={20} strokeWidth={2} aria-hidden /> : <Download size={20} strokeWidth={1.75} aria-hidden />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] text-ink">Install app</span>
          <span className="block text-[13px] text-ink-secondary">
            {installed ? "Installed on this device" : "Opens from your home screen, Start menu or Dock, full screen"}
          </span>
        </span>
        {install.kind === "prompt" ? (
          <Button className="h-10 px-5 text-[15px]" onClick={() => void promptInstall()}>
            Install
          </Button>
        ) : (
          !installed && (
            <Button variant="secondary" className="h-10 px-4 text-[15px]" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              How
            </Button>
          )
        )}
      </div>
      {open && !installed && <p className="mt-3 pl-14 text-[14px] leading-[20px] text-ink-secondary">{how}</p>}
    </div>
  );
}
