import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { usesSampleData } from "@/lib/supabase/config";
import { Chip } from "./chip";
export { IconBadge, iconBadgeClass, type IconBadgeTone, type IconBadgeSize } from "./icon-badge";

import type { LucideIcon } from "lucide-react";

const iconToneStyles: Record<string, string> = {
  accent: "bg-accent-soft text-accent",
  good: "bg-good-soft text-good",
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  teal: "bg-teal-soft text-teal",
  purple: "bg-purple-soft text-purple",
  dark: "bg-[#0c192c] text-white",
  neutral: "bg-hairline text-ink-secondary",
};

/** White card with a title row and an optional action link on the right. */
export function SectionCard({
  title,
  icon: Icon,
  iconTone = "accent",
  action,
  className,
  children,
}: {
  title?: ReactNode;
  icon?: LucideIcon;
  iconTone?: "accent" | "good" | "danger" | "warning" | "teal" | "purple" | "dark" | "neutral";
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("surface p-5 md:p-6", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && (
            <h2 className="flex items-center gap-2.5 text-[17px] font-semibold tracking-[-0.3px] text-ink">
              {Icon ? (
                <span className={cn("grid size-7 place-items-center rounded-lg shrink-0", iconToneStyles[iconTone])}>
                  <Icon size={14} strokeWidth={2.2} aria-hidden />
                </span>
              ) : (
                <span className="block h-[18px] w-1 shrink-0 rounded-full bg-[linear-gradient(180deg,var(--accent),var(--teal))]" />
              )}
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "danger" | "good" | "warning";
  className?: string;
}) {
  return (
    <section data-tone={tone} className={cn("surface stat-card min-w-0 p-3.5 md:p-5", className)}>
      <h2 className="truncate text-[12px] font-medium text-[color:var(--stat)] md:text-[13px]">{label}</h2>
      <p
        className={cn(
          "mt-1.5 truncate text-[15px] font-semibold tabular-nums tracking-[-0.2px] md:text-[22px]",
          tone === "danger" ? "text-danger" : tone === "good" ? "text-good" : tone === "warning" ? "text-warning" : "text-ink",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 truncate text-[12px] text-ink-secondary">{hint}</p>}
    </section>
  );
}

/** Stat cards: a swipeable row on phones (so numbers never get cut off), an even grid from tablet width up. */
export function StatRow({ children, className, label = "Summary" }: { children: ReactNode; className?: string; label?: string }) {
  const count = Array.isArray(children) ? children.filter(Boolean).length : 1;
  return (
    // Focusable so the row can be scrolled with the keyboard on phones, where it swipes sideways.
    <div
      role="group"
      aria-label={label}
      tabIndex={0}
      className={cn(
        "no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:gap-4 md:overflow-visible md:px-0 md:pb-0",
        "[&>*]:min-w-[46%] [&>*]:snap-start md:[&>*]:min-w-0",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    // 44px tall for thumbs; the negative margins keep it taking the same space as one line of text.
    <Link href={href} className="-mt-2.5 mb-[-7px] flex h-11 w-fit items-center text-[15px] text-link hover:underline print:hidden">
      ‹ {children}
    </Link>
  );
}

/** Shown on every page while the app runs on sample data. */
export function SampleChip() {
  return usesSampleData ? <Chip tone="warning">Sample data</Chip> : null;
}

/** "Original data", "Sample data" or "Original + sample" for a list, from whether its records are the firm's own. */
export function OriginChip({ records }: { records: { original?: boolean }[] }) {
  if (!usesSampleData) return null;
  const own = records.filter((r) => r.original).length;
  if (own === 0) return <Chip tone="warning">Sample data</Chip>;
  if (own === records.length) return <Chip tone="good">Original data</Chip>;
  return <Chip tone="accent">Original + sample</Chip>;
}

/** A small "Sample" mark on one sample record in a list that also holds the firm's own records. */
export function SampleTag({ record }: { record: { original?: boolean } }) {
  return usesSampleData && !record.original ? (
    <Chip tone="warning" className="ml-2 h-5 px-2 align-middle text-[11px]">
      Sample
    </Chip>
  ) : null;
}

export function DetailList({ items, className }: { items: { label: string; value: ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("divide-y divide-hairline", className)}>
      {items
        .filter((i) => i.value !== undefined && i.value !== null && i.value !== "")
        .map((i) => (
          <div key={i.label} className="flex justify-between gap-4 py-2.5 text-[15px]">
            <dt className="shrink-0 text-ink-secondary">{i.label}</dt>
            <dd className="min-w-0 text-right text-ink">{i.value}</dd>
          </div>
        ))}
    </dl>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-hairline", className)} aria-hidden />;
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="surface space-y-3 p-5" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10" />
      ))}
    </div>
  );
}
