import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Status colours always mean the same thing: good = paid, warning = due soon, danger = overdue / over limit. */
export type ChipTone = "good" | "warning" | "danger" | "accent" | "neutral";

const tones: Record<ChipTone, string> = {
  good: "bg-good-soft text-good",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  accent: "bg-accent-soft text-accent",
  neutral: "bg-hairline text-ink-secondary",
};

export function Chip({ tone = "neutral", className, children }: { tone?: ChipTone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
