"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { useToast } from "./toast";

export type DeleteResult = { ok: true } | { ok: false; problem: string };

/**
 * Delete with a second tap to confirm: "Delete" opens "Delete Shop 2? It can't be undone. [Keep] [Delete]".
 * Afterwards it goes to `after` (when the thing's own page is gone) or refreshes the page.
 */
export function ConfirmDelete({
  what,
  onDelete,
  after,
  compact,
  className,
}: {
  /** What is deleted, in the question: "Delete {what}?" */
  what: string;
  onDelete: () => Promise<DeleteResult>;
  after?: string;
  /** Just a bin icon until tapped, for rows in a list. */
  compact?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        aria-label={`Delete ${what}`}
        title={`Delete ${what}`}
        className={cn(
          compact
            ? "grid size-9 shrink-0 place-items-center rounded-full text-ink-secondary hover:bg-danger-soft hover:text-danger"
            : "inline-flex items-center gap-1.5 text-[14px] font-medium text-danger hover:underline",
          className,
        )}
      >
        <Trash2 size={compact ? 16 : 15} strokeWidth={1.9} aria-hidden />
        {!compact && "Delete"}
      </button>
    );
  }
  return (
    <div role="alertdialog" aria-label={`Delete ${what}?`} className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-danger-soft px-3.5 py-2.5", className)}>
      <p className="min-w-0 flex-1 text-[14px] text-ink">
        Delete <span className="font-semibold">{what}</span>? It can&apos;t be undone.
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={() => setAsking(false)} className="rounded-full px-3 py-1.5 text-[14px] font-medium text-ink-secondary hover:bg-card">
          Keep
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await onDelete();
              if (!result.ok) {
                toast(result.problem);
                setAsking(false);
                return;
              }
              toast(`${what} deleted`);
              if (after) router.push(after);
              else router.refresh();
            })
          }
          className="rounded-full bg-danger px-3.5 py-1.5 text-[14px] font-medium text-white disabled:opacity-50"
        >
          {pending ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
