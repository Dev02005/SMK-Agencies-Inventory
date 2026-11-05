import type { Product } from "@/lib/data/types";
import { cn } from "@/lib/cn";
import { formatINR, formatNumber, formatShortDate } from "@/lib/format";
import { unitLabel } from "@/lib/sales";

export type SoldBill = { date?: string; billNo: string; soldTo?: string; qty: number; amount: number };

/**
 * What a company lorry has sold: one bar per item ("150 bags left of 600", the filled part sold), then the sale bills
 * from it, each with its date, number, buyer, bags and amount. The same on the lorry sale's page and in the lists.
 */
export function LorryProgress({
  loaded,
  sold,
  products,
  bills,
}: {
  /** What came on the lorry. */
  loaded: { productId: string; qty: number }[];
  /** How much of each item is sold. */
  sold: (productId: string) => number;
  products: Product[];
  /** The sale bills so far; no list when there are none. */
  bills?: SoldBill[];
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
            {bills.map((b, i) => (
              <li key={i} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-baseline gap-3 py-2 text-[15px]">
                <span className="w-14 text-[13px] text-ink-secondary">{b.date ? formatShortDate(b.date) : ""}</span>
                <span className="truncate text-ink">
                  Bill {b.billNo}
                  {b.soldTo && <span className="text-ink-secondary"> · {b.soldTo}</span>}
                </span>
                <span className="tabular-nums text-ink-secondary">{formatNumber(b.qty)} bags</span>
                <span className="font-medium tabular-nums text-ink">{formatINR(b.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
