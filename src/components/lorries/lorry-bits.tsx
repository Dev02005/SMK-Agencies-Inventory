import { Truck } from "lucide-react";
import { SampleTag } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import type { Lorry, Product } from "@/lib/data/types";
import { formatDate, formatINR } from "@/lib/format";
import { lorryState, lorryStateChip } from "@/lib/lorries";
import { lineQty } from "@/lib/quantities";

/** "AP 39 T 1234" with the lorry icon, marked when it is sample data. */
export function LorryTitle({ lorry }: { lorry: Lorry }) {
  return (
    <span className="flex items-center gap-2">
      <Truck size={20} strokeWidth={1.75} className="text-warning" aria-hidden />
      {lorry.lorryNo}
      <SampleTag record={lorry} />
    </span>
  );
}

/** Selling or Sold out. */
export function LorryStateChip({ lorry }: { lorry: Lorry }) {
  const state = lorryStateChip[lorryState(lorry)];
  return <Chip tone={state.tone}>{state.label}</Chip>;
}

/** Company · driver's number · our sale invoice (or the company's, on an older lorry) · date, and which firm bought it. */
export function LorryMeta({ lorry, firmName }: { lorry: Lorry; firmName?: string }) {
  const invoiceNo = lorry.sale?.invoiceNo ?? lorry.invoiceNo;
  return (
    <>
      <p className="-mt-2 text-[13px] text-ink-secondary">
        {[lorry.companyName, lorry.driverMobile && `driver +91 ${lorry.driverMobile}`, invoiceNo && `invoice ${invoiceNo}`, formatDate(lorry.invoiceDate), lorry.receivedOn && lorry.receivedOn !== lorry.invoiceDate && `received ${formatDate(lorry.receivedOn)}`]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {firmName && <p className="mt-1 text-[12px] font-medium text-accent">For {firmName}</p>}
    </>
  );
}

/** What came on the lorry. */
export function LorryItems({ lorry, products }: { lorry: Lorry; products: Product[] }) {
  return (
    <ul className="mt-3 divide-y divide-hairline">
      {lorry.lines.map((l) => {
        const product = products.find((p) => p.id === l.productId);
        return (
          <li key={l.productId} className="flex justify-between gap-3 py-2 text-[15px]">
            <span className="text-ink">{product?.name ?? "Item"}</span>
            <span className="tabular-nums text-ink">{lineQty(l.qty, product)}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** What it was bought for, whether we have the paper copy, and whether unloading charges are paid to us. */
export function LorryCost({ lorry }: { lorry: Lorry }) {
  return (
    <dl className="mt-2 space-y-1 border-t border-hairline pt-2 text-[15px]">
      <div className="flex justify-between">
        <dt className="text-ink-secondary">Bought for (company invoice)</dt>
        <dd className="font-semibold tabular-nums text-ink">{lorry.invoiceValue ? formatINR(lorry.invoiceValue) : "Not entered"}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-ink-secondary">Physical invoice paper copy</dt>
        <dd className="text-ink">{lorry.invoicePaperKept ? "With us" : "Not with us"}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-ink-secondary">Unloading charges paid to us</dt>
        <dd className="text-ink">{lorry.unloadingCharges ? "Yes" : "No"}</dd>
      </div>
    </dl>
  );
}
