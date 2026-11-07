import Link from "next/link";
import type { Product } from "@/lib/data/types";
import { cn } from "@/lib/cn";
import { formatINR, formatNumber, formatShortDate } from "@/lib/format";
import { unitLabel } from "@/lib/sales";
import type { SaleParty } from "@/app/(app)/sales/new/new-sale-form";

export type SoldBill = {
  date?: string;
  billNo: string;
  partyId?: string;
  soldTo?: string;
  cashName?: string;
  cashMobile?: string;
  place?: string;
  qty: number;
  amount: number;
};

/**
 * What a company lorry has sold: one bar per item ("150 bags left of 600", the filled part sold), then the sale bills
 * from it, each with its date, number, buyer, bags and amount. The same on the lorry sale's page and in the lists.
 */
export function LorryProgress({
  loaded,
  sold,
  products,
  bills,
  parties,
}: {
  /** What came on the lorry. */
  loaded: { productId: string; qty: number }[];
  /** How much of each item is sold. */
  sold: (productId: string) => number;
  products: Product[];
  /** The sale bills so far; no list when there are none. */
  bills?: SoldBill[];
  /** Available customer and party list for customer matching */
  parties?: SaleParty[];
}) {
  const product = (pid: string) => products.find((p) => p.id === pid);
  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {loaded.map((l) => {
          const p = product(l.productId);
          const unit = unitLabel[p?.unit ?? "bag"];
          const soldQty = sold(l.productId);
          const left = l.qty - soldQty;
          const share = l.qty > 0 ? Math.min(100, Math.max(0, (soldQty / l.qty) * 100)) : 0;
          return (
            <li key={l.productId}>
              <p className="flex items-baseline justify-between gap-3 text-[15px]">
                <span className="font-medium text-ink">{p?.name ?? "Item"}</span>
                <span className={cn("tabular-nums", left < 0 ? "font-semibold text-danger" : "text-ink")}>
                  <span className="font-semibold">
                    {formatNumber(left)} {unit}
                  </span>{" "}
                  left of {formatNumber(l.qty)}
                </span>
              </p>
              <div
                className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-hairline"
                role="img"
                aria-label={`${formatNumber(soldQty)} of ${formatNumber(l.qty)} ${unit} sold, ${formatNumber(left)} left`}
              >
                <div className={cn("h-full rounded-full transition-[width]", left < 0 ? "bg-danger" : left === 0 ? "bg-good" : "bg-warning")} style={{ width: `${share}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      {bills && bills.length > 0 && (
        <div>
          <p className="text-[15px] font-semibold text-ink">Sold from this lorry</p>
          <ul className="mt-1 divide-y divide-hairline">
            {bills.map((b, i) => {
              const party = parties?.find(
                (p) => p.id === b.partyId || (b.soldTo && p.name.trim().toLowerCase() === b.soldTo.trim().toLowerCase()),
              );
              const displayName = party?.name ?? b.cashName ?? b.soldTo;
              const displayPlace = party?.place ?? b.place;
              const displayMobile = party?.mobile ?? b.cashMobile;

              return (
                <li key={i} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-[15px]">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold tabular-nums text-ink">Bill #{b.billNo}</span>
                      {b.date && <span className="text-[12px] text-ink-secondary">· {formatShortDate(b.date)}</span>}
                      {party ? (
                        <Link href={`/parties/${party.id}`} className="font-medium text-link hover:underline">
                          {party.name}
                        </Link>
                      ) : displayName ? (
                        <span className="font-medium text-ink">{displayName}</span>
                      ) : (
                        <span className="text-ink-secondary italic">Spot sale</span>
                      )}
                      {party?.kind && (
                        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                          {party.kind === "sub_dealer" ? "Sub-dealer" : "Customer"}
                        </span>
                      )}
                      {party && party.outstanding > 0 && (
                        <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning tabular-nums">
                          Bal {formatINR(party.outstanding)}
                        </span>
                      )}
                    </div>
                    {(displayPlace || displayMobile) && (
                      <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-secondary mt-0.5">
                        {displayPlace && <span>{displayPlace}</span>}
                        {displayPlace && displayMobile && <span>·</span>}
                        {displayMobile && (
                          <a href={`tel:+91${displayMobile}`} className="hover:text-ink hover:underline">
                            +91 {displayMobile}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block font-semibold tabular-nums text-ink">{formatINR(b.amount)}</span>
                    <span className="block text-[12px] tabular-nums text-ink-secondary">{formatNumber(b.qty)} bags</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
