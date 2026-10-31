"use client";

import type { ReactNode } from "react";
import { Button } from "./button";

/**
 * The form's one blue button: fixed above the tab bar on phones (with an optional total),
 * and at the end of the form from tablet width up.
 */
export function SubmitBar({
  label,
  disabled,
  hint,
  summary,
  onSubmit,
}: {
  label: string;
  disabled?: boolean;
  hint?: string | null;
  summary?: { label: string; value: ReactNode };
  onSubmit: () => void;
}) {
  return (
    <>
      <div className="hidden items-center justify-end gap-4 md:flex">
        {hint && <p className="text-[13px] text-ink-secondary">{hint}</p>}
        <Button disabled={disabled} onClick={onSubmit}>
          {label}
        </Button>
      </div>

      {hint && <p className="px-1 text-[13px] text-ink-secondary md:hidden">{hint}</p>}
      <div className="h-20 md:hidden" aria-hidden />
      <div className="frosted fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-20 border-t border-black/[0.08] md:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          {summary ? (
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-ink-secondary">{summary.label}</p>
              <p className="truncate text-[20px] font-semibold tabular-nums tracking-[-0.3px] text-ink">{summary.value}</p>
            </div>
          ) : (
            <div className="flex-1" />
          )}
          <Button disabled={disabled} onClick={onSubmit} className={summary ? undefined : "w-full"}>
            {label}
          </Button>
        </div>
      </div>
    </>
  );
}
