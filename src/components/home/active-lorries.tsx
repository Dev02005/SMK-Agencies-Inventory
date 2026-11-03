import { BellRing, Truck } from "lucide-react";
import Link from "next/link";
import { SampleTag, SectionCard } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/cn";
import type { Lorry, Product } from "@/lib/data/types";
import { formatDate } from "@/lib/format";
import { daysFrom, lorryLeft, lorryState, lorryStateChip, updateDueOn } from "@/lib/lorries";
import { describeQuantities } from "@/lib/quantities";

/**
 * Home's reminder: lorries whose sale should have been updated by now (or is due today). It shows until each one's
 * sale is updated under Sales › Lorry sales.
 */
export function LorryUpdateReminder({ lorries, today, className }: { lorries: Lorry[]; today: string; className?: string }) {
  const due = lorries.filter((l) => {
    const state = lorryState(l, today);
    return state === "due" || state === "late";
  });
  if (due.length === 0) return null;
  const anyLate = due.some((l) => lorryState(l, today) === "late");
  return (
    <section role="alert" className={cn("rounded-[20px] border p-5", anyLate ? "border-danger/30 bg-danger-soft" : "border-warning/30 bg-warning-soft", className)}>
      <h2 className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.3px] text-ink">
        <BellRing size={19} strokeWidth={2} className={anyLate ? "text-danger" : "text-warning"} aria-hidden />
        Update lorry {due.length === 1 ? "sale" : "sales"}
      </h2>
      <p className="mt-0.5 text-[13px] text-ink-secondary">Enter what {due.length === 1 ? "this lorry" : "these lorries"} sold for once sold out.</p>
      <ul className="mt-3 space-y-2">
        {due.map((l) => {
          const late = daysFrom(updateDueOn(l), today);
          return (
            <li key={l.id} className="flex items-center gap-3 rounded-2xl bg-card px-3.5 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-ink">
                  {l.lorryNo}
                  <SampleTag record={l} />
                </p>
                <p className="truncate text-[13px] text-ink-secondary">
                  {l.companyName} · bought {formatDate(l.invoiceDate)} · {late > 0 ? `${late} ${late === 1 ? "day" : "days"} late` : "due today"}
                </p>
              </div>
              <Link href={`/sales/lorries/${l.id}`} className="shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-[14px] font-medium text-white hover:bg-accent/90">
                Update
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Home: company lorries being sold off the truck right now, with what came on them and when the sale update is due. */
export function ActiveLorries({ lorries, products, today, className }: { lorries: Lorry[]; products: Product[]; today: string; className?: string }) {
  const selling = lorries.filter((l) => !l.sold);
  return (
    <SectionCard
      title="Lorries selling now"
      action={
        <Link href="/sales/lorries" className="text-[15px] text-link hover:underline">
          Lorry sales ›
        </Link>
      }
      className={className}
    >
      {selling.length === 0 ? (
        <p className="py-3 text-[15px] text-ink-secondary">No lorry is selling right now.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {selling.map((l) => {
            const state = lorryState(l, today);
            return (
              <li key={l.id} className="flex items-start gap-3 rounded-2xl bg-warning-soft/60 p-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-warning text-white">
                  <Truck size={20} strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-ink">
                    {l.lorryNo}
                    {state !== "selling" && <Chip tone={lorryStateChip[state].tone}>{lorryStateChip[state].label}</Chip>}
                    <SampleTag record={l} />
                  </p>
                  <p className="truncate text-[13px] text-ink-secondary">
                    {l.companyName}
                    {l.driverName && ` · ${l.driverName}`} · since {formatDate(l.invoiceDate)}
                  </p>
                  <p className="mt-1 text-[13px] text-ink">
                    {describeQuantities(lorryLeft(l), products)} left
                    <span className="text-ink-secondary"> · update by {formatDate(updateDueOn(l))}</span>
                  </p>
                </div>
                <Link
                  href={`/sales/lorries/${l.id}`}
                  className="shrink-0 self-center rounded-full bg-card px-3.5 py-1.5 text-[14px] font-medium text-accent shadow-card hover:bg-accent-soft"
                >
                  Update
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
