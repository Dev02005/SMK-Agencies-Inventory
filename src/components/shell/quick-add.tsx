"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { cn } from "@/lib/cn";
import type { Role } from "@/lib/data/types";
import { quickAddItems, toneClasses } from "@/lib/sections";

/** Bottom sheet on phones, a small panel under the "+" button on larger screens. */
export function QuickAdd({ role, onClose }: { role: Role; onClose: () => void }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Add new">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="animate-sheet-up absolute inset-x-0 bottom-0 rounded-t-sheet bg-card p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-sheet md:animate-fade-up md:inset-x-auto md:bottom-auto md:right-8 md:top-16 md:w-96 md:rounded-card md:shadow-raised">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[20px] font-semibold tracking-[-0.3px] text-ink">Quick add</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-xl bg-hairline text-ink-secondary hover:bg-divider hover:text-ink transition-colors cursor-pointer"
          >
            <X size={15} strokeWidth={2.2} aria-hidden />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {quickAddItems.filter((item) => item.roles.includes(role)).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className="group flex flex-col items-center gap-2 rounded-2xl p-2.5 text-center text-[13px] text-ink transition hover:bg-card-subtle"
              >
                {/* Signature Squircle Icon Container */}
                <span className={cn("grid size-12 place-items-center rounded-2xl shadow-xs transition-transform group-hover:scale-105", toneClasses[item.tone])}>
                  <Icon size={22} strokeWidth={2} aria-hidden />
                </span>
                <span className="font-medium text-ink leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
