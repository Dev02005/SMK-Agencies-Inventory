"use client";

import { Truck } from "lucide-react";
import Link from "next/link";
import { SectionCard } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import type { Product } from "@/lib/data/types";
import { addDaysISO, formatDate } from "@/lib/format";
import { useLorryBook } from "@/lib/lorry-book";
import { describeQuantities } from "@/lib/quantities";

export type SellingLorry = {
  id: string;
  lorryNo: string;
  companyName: string;
  driverName?: string;
  arrivedOn: string;
  sellOutDays?: number;
  /** What is still on the lorry, if known. */
  left?: { productId: string; qty: number }[];
};

/** Home: company lorries being sold off the truck right now, with what is left and a quick way to bill from one. */
export function ActiveLorries({ lorries, products, today, className }: { lorries: SellingLorry[]; products: Product[]; today: string; className?: string }) {
  // Lorries noted on this device (sample mode) join the ones from the data.
  const device: SellingLorry[] = useLorryBook()
    .filter((l) => !l.closed)
    .map((l) => ({ id: l.id, lorryNo: l.lorryNo, companyName: l.companyName, driverName: l.driverName, arrivedOn: l.arrivedOn, sellOutDays: l.sellOutDays, left: l.lines }));
  const all = [...device, ...lorries];

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
      {all.length === 0 ? (
        <p className="py-3 text-[15px] text-ink-secondary">No lorry is selling right now.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {all.map((l) => {
            const by = l.sellOutDays ? addDaysISO(l.arrivedOn, l.sellOutDays) : undefined;
            const late = by !== undefined && today > by;
            const left = l.left?.length ? describeQuantities(l.left, products) : undefined;
            return (
              <li key={l.id} className="flex items-start gap-3 rounded-2xl bg-warning-soft/60 p-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-warning text-white">
                  <Truck size={20} strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-ink">
                    {l.lorryNo}
                    {late && <Chip tone="danger">Past sell-out day</Chip>}
                  </p>
                  <p className="truncate text-[13px] text-ink-secondary">
                    {l.companyName}
                    {l.driverName && ` · ${l.driverName}`} · since {formatDate(l.arrivedOn)}
                  </p>
                  <p className="mt-1 text-[13px] text-ink">
                    {left ? `${left} left` : "Bags not noted"}
                    {by && <span className="text-ink-secondary"> · sells out by {formatDate(by)}</span>}
                  </p>
                </div>
                <Link href={`/sales/new?lorry=${l.id}`} className="shrink-0 self-center rounded-full bg-card px-3.5 py-1.5 text-[14px] font-medium text-accent shadow-card hover:bg-accent-soft">
                  Sell
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
