"use client";

import { Plus, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/blocks";

/**
 * A button ("Add insurance") that opens its form in a card under it; the card's × closes it again. Keeps a page's add
 * form out of the way until it is wanted.
 */
export function AddPanel({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setOpen(true)} className="gap-1.5">
          <Plus size={18} strokeWidth={2.25} aria-hidden /> {label}
        </Button>
      </div>
    );
  }
  return (
    <SectionCard
      title={title}
      className="mb-4"
      action={
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          title="Close"
          className="grid size-9 place-items-center rounded-full text-ink-secondary hover:bg-hairline hover:text-ink"
        >
          <X size={18} strokeWidth={2} aria-hidden />
        </button>
      }
    >
      {children}
    </SectionCard>
  );
}
