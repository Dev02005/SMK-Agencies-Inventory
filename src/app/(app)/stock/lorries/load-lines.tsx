import type { Product } from "@/lib/data/types";
import { formatNumber } from "@/lib/format";
import { lineQty } from "@/lib/quantities";

export type LoadLine = { productId: string; loaded: number; sold: number; left: number };

/** "150 bags left of 600" with a bar of what's sold, for each item on a lorry. */
export function LoadLines({ lines, products }: { lines: LoadLine[]; products: Product[] }) {
  return (
    <div className="mt-4 space-y-3">
      {lines.map((l) => {
        const p = products.find((x) => x.id === l.productId);
        return (
          <div key={l.productId}>
            <div className="flex justify-between text-[15px]">
              <span className="text-ink">{p?.name}</span>
              <span className="tabular-nums text-ink">
                <span className="font-semibold">{lineQty(l.left, p)}</span> left of {formatNumber(l.loaded)}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-hairline" role="img" aria-label={`${l.sold} sold of ${l.loaded}`}>
              <div className="h-full bg-warning" style={{ width: `${(l.sold / l.loaded) * 100}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
