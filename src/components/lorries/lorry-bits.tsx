import { Truck } from "lucide-react";
import { SampleTag } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import type { Lorry, Product } from "@/lib/data/types";
import { formatDate, formatINR } from "@/lib/format";
import { daysFrom, lorryState, lorryStateChip, updateDueOn } from "@/lib/lorries";
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

/** Selling, Update due today, Sale not updated, or Sold out. */
export function LorryStateChip({ lorry, today }: { lorry: Lorry; today: string }) {
  const state = lorryStateChip[lorryState(lorry, today)];
  return <Chip tone={state.tone}>{state.label}</Chip>;
}

/** Company · driver · invoice · date, and which firm bought it. */
export function LorryMeta({ lorry, firmName }: { lorry: Lorry; firmName?: string }) {
  return (
    <>
      <p className="-mt-2 text-[13px] text-ink-secondary">
        {[lorry.companyName, lorry.driverName && `driver ${lorry.driverName}`, lorry.invoiceNo ? `invoice ${lorry.invoiceNo}` : "no invoice number", formatDate(lorry.invoiceDate)]
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

/** The invoice value, whether we have the paper copy, and whether unloading charges are paid to us. */
export function LorryCost({ lorry }: { lorry: Lorry }) {
  return (
    <dl className="mt-2 space-y-1 border-t border-hairline pt-2 text-[15px]">
      <div className="flex justify-between">
        <dt className="text-ink-secondary">Invoice value</dt>
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

/** "Update the sale by 5 Nov", "due today" or "3 days late", while the lorry is still selling. */
export function LorryDue({ lorry, today }: { lorry: Lorry; today: string }) {
  const state = lorryState(lorry, today);
  if (state === "sold") return null;
  const due = updateDueOn(lorry);
  const late = daysFrom(due, today);
  return (
    <p className={state === "late" ? "mt-2 text-[13px] font-medium text-danger" : state === "due" ? "mt-2 text-[13px] font-medium text-warning" : "mt-2 text-[13px] text-ink-secondary"}>
      {state === "late"
        ? `Not marked sold out · update was due ${formatDate(due)} (${late} ${late === 1 ? "day" : "days"} late)`
        : state === "due"
          ? "Sale update due today"
          : `Sells out in about ${lorry.sellOutDays} ${lorry.sellOutDays === 1 ? "day" : "days"} · update the sale by ${formatDate(due)}`}
    </p>
  );
}
