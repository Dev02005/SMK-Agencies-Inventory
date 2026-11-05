import { CircleAlert, Truck } from "lucide-react";
import Link from "next/link";
import { SampleTag, SectionCard } from "@/components/ui/blocks";
import type { Lorry, Product } from "@/lib/data/types";
import { formatDate } from "@/lib/format";
import { lorryLeft, lorryMissing } from "@/lib/lorries";
import { describeQuantities } from "@/lib/quantities";

/**
 * Home: company lorries being sold off the truck right now, with what is left on them, and any lorry that has sold
 * out with details still missing (the tick boxes, the total invoice value), until they are filled in.
 */
export function ActiveLorries({
  lorries,
  products,
  className,
}: {
  lorries: Lorry[];
  products: Product[];
  className?: string;
}) {
  const selling = lorries.filter((l) => !l.sold || lorryMissing(l).length > 0).sort((a, b) => Number(Boolean(a.sold)) - Number(Boolean(b.sold)));
  return (
    <SectionCard
      title="Lorries selling now"
      action={
        <Link
          href="/sales/lorries"
          className="text-[15px] text-link hover:underline"
        >
          Lorry sales ›
        </Link>
      }
      className={className}
    >
      {selling.length === 0 ? (
        <p className="py-3 text-[15px] text-ink-secondary">
          No lorry is selling right now.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {selling.map((l) => {
            const missing = lorryMissing(l);
            return (
            <li
              key={l.id}
              className="flex items-start gap-3 rounded-2xl bg-warning-soft/60 p-3.5"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-warning text-white">
                <Truck size={20} strokeWidth={1.75} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-ink">
                  {l.lorryNo}
                  {l.sold && <span className="rounded-full bg-good-soft px-2 py-0.5 text-[12px] font-medium text-good">Sold out</span>}
                  <SampleTag record={l} />
                </p>
                <p className="truncate text-[13px] text-ink-secondary">
                  {l.companyName}
                  {l.driverMobile && ` · driver +91 ${l.driverMobile}`} · since{" "}
                  {formatDate(l.invoiceDate)}
                </p>
                {!l.sold && (
                  <p className="mt-1 text-[13px] text-ink">
                    {describeQuantities(lorryLeft(l), products)} left
                  </p>
                )}
                {missing.length > 0 && (
                  <p className="mt-1 flex items-start gap-1.5 text-[13px] font-medium text-danger">
                    <CircleAlert size={15} strokeWidth={2} className="mt-px shrink-0" aria-hidden />
                    <span>Missing: {missing.join(", ")}</span>
                  </p>
                )}
              </div>
              <Link
                href={`/sales/lorries/${l.id}`}
                className="shrink-0 self-center rounded-full bg-card px-3.5 py-1.5 text-[14px] font-medium text-accent shadow-card hover:bg-accent-soft"
              >
                {l.sold ? "Complete" : "Update"}
              </Link>
            </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
