"use client";

import { cn } from "@/lib/cn";

export type FirmChoice = { id: string; name: string; gstin: string };

/** The owner's firms side by side, numbered, to say which firm a purchase (or other record) belongs to. */
export function FirmPicker({ firms, value, onChange, label }: { firms: FirmChoice[]; value: string; onChange: (id: string) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-3">
      {firms.map((f, i) => {
        const picked = f.id === value;
        return (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={picked}
            onClick={() => onChange(f.id)}
            className={cn(
              "flex min-h-[72px] items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors md:p-4",
              picked ? "border-accent bg-accent-soft shadow-card" : "border-hairline bg-card hover:bg-card-subtle",
            )}
          >
            <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-[14px] font-semibold", picked ? "bg-accent text-white" : "bg-hairline text-ink-secondary")}>
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className={cn("block text-[15px] font-semibold leading-[20px]", picked ? "text-accent" : "text-ink")}>{f.name}</span>
              <span className="block truncate text-[12px] text-ink-secondary">{f.gstin ? `GSTIN ${f.gstin}` : "GSTIN not added yet"}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
