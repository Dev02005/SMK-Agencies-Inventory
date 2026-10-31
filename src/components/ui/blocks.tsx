import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Chip } from "./chip";

/** White card with a title row and an optional action link on the right. */
export function SectionCard({
  title,
  action,
  className,
  children,
}: {
  title?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("surface p-5 md:p-6", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-[17px] font-semibold tracking-[-0.3px] text-ink">{title}</h2>}
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
    <section className={cn("surface min-w-0 p-3.5 md:p-5", className)}>
      <h2 className="truncate text-[12px] text-ink-secondary md:text-[13px]">{label}</h2>
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
  return isSupabaseConfigured ? null : <Chip tone="warning">Sample data</Chip>;
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
