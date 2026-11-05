"use client";

import { Plus, ReceiptText, X } from "lucide-react";
import { LorryProgress } from "@/components/lorries/lorry-progress";
import { DatePicker } from "@/components/ui/date-picker";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/data/types";
import { formatINR } from "@/lib/format";
import { unitLabel } from "@/lib/sales";

/**
 * One sale bill from the lorry, as typed: its date, who bought, how much of each item and the bill's amount.
 * `billNo` is its saved number; a new bill has none until it is saved, when it takes the next in the series.
 */
export type BillRow = { key: number; date: string; billNo: string; soldTo: string; qty: Record<string, string>; amount: string };

export const num = (v: string | undefined) => (v && Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);
export const emptyBill = (key: number, date: string): BillRow => ({ key, date, billNo: "", soldTo: "", qty: {}, amount: "" });
/** Whether anything has been typed on the bill (a saved bill always counts). */
export const billUsed = (b: BillRow) => Boolean(b.billNo || b.soldTo.trim() || num(b.amount) > 0 || Object.values(b.qty).some((q) => num(q) > 0));
/** The number each bill has, or will get when saved: new bills take the next numbers in the series, in order. */
export function billNumbers(bills: BillRow[], seriesNext: number) {
  let next = seriesNext;
  return new Map(bills.map((b) => [b.key, b.billNo || String(next++)]));
}

/**
 * What a company lorry sold, bill by bill: 150 bags on one bill for ₹X, 50 on another for ₹Y, and what is still on
 * the lorry. "Add bill" adds another.
 */
export function SoldInBills({
  loaded,
  products,
  bills,
  onChange,
  today,
  seriesNext,
}: {
  /** What came on the lorry. */
  loaded: { productId: string; qty: number }[];
  products: Product[];
  bills: BillRow[];
  onChange: (bills: BillRow[]) => void;
  today: string;
  /** The next number in the bill series, for a new bill. */
  seriesNext: number;
}) {
  const id = useId();
  const product = (pid: string) => products.find((p) => p.id === pid);
  const unitOf = (pid: string) => unitLabel[product(pid)?.unit ?? "bag"];
  const soldOf = (pid: string) => bills.reduce((s, b) => s + num(b.qty[pid]), 0);
  const update = (key: number, patch: Partial<BillRow>) => onChange(bills.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  const add = () => onChange([...bills, emptyBill(Math.max(0, ...bills.map((b) => b.key)) + 1, today)]);
  const numbers = billNumbers(bills, seriesNext);
  const billsTotal = bills.reduce((s, b) => s + num(b.amount), 0);

  return (
    <section className="surface p-5">
      <h2 className="text-[17px] font-semibold tracking-[-0.3px] text-ink">Sale bills from this lorry</h2>
      <p className="mt-0.5 text-[13px] text-ink-secondary">One row for each bill: the bags on it and its amount. Each new bill takes the next number in the series (godown and lorry bills share it) when saved.</p>

      {/* What is left on the lorry, as the bills below are typed. */}
      <div className="mt-4 rounded-2xl bg-card-subtle p-4">
        <LorryProgress loaded={loaded} sold={soldOf} products={products} />
      </div>

      <ol className="mt-4 space-y-3">
        {bills.map((b) => {
          const qtyHere = loaded.reduce((s, l) => s + num(b.qty[l.productId]), 0);
          const number = numbers.get(b.key) ?? "";
          const noAmount = qtyHere > 0 && !(num(b.amount) > 0);
          const noQty = num(b.amount) > 0 && qtyHere === 0;
          return (
            <li key={b.key} className="rounded-2xl border border-hairline p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
                  <ReceiptText size={16} strokeWidth={1.9} className="text-accent" aria-hidden />
                  Bill {number}
                  {!b.billNo && <span className="text-[12px] font-normal text-ink-secondary">· new, numbered on save</span>}
                </p>
                {bills.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove bill ${number}`}
                    onClick={() => onChange(bills.filter((x) => x.key !== b.key))}
                    className="grid size-9 shrink-0 place-items-center rounded-full text-ink-secondary hover:bg-hairline"
                  >
                    <X size={18} strokeWidth={2} aria-hidden />
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Bill date" htmlFor={`${id}-${b.key}-date`}>
                  <DatePicker id={`${id}-${b.key}-date`} label="Bill date" value={b.date} onChange={(date) => update(b.key, { date })} />
                </Field>
                <Field label="Bill no." htmlFor={`${id}-${b.key}-no`} hint={b.billNo ? "Saved" : "Next in the series"}>
                  <output id={`${id}-${b.key}-no`} className={cn(inputClass, "flex items-center bg-card-subtle tabular-nums")}>
                    {number}
                  </output>
                </Field>
                <Field label="Sold to" htmlFor={`${id}-${b.key}-to`} hint="Optional: party or village">
                  <input id={`${id}-${b.key}-to`} className={inputClass} maxLength={60} value={b.soldTo} onChange={(e) => update(b.key, { soldTo: e.target.value })} />
                </Field>
                {loaded.map((l) => (
                  <Field
                    key={l.productId}
                    label={loaded.length > 1 ? (product(l.productId)?.name ?? "Item") : "Quantity on this bill"}
                    htmlFor={`${id}-${b.key}-${l.productId}`}
                    error={noQty && l === loaded[0] ? "Enter how much is on this bill." : undefined}
                  >
                    <AffixInput
                      id={`${id}-${b.key}-${l.productId}`}
                      inputMode="decimal"
                      placeholder="0"
                      suffix={unitOf(l.productId)}
                      value={b.qty[l.productId] ?? ""}
                      onChange={(e) => update(b.key, { qty: { ...b.qty, [l.productId]: e.target.value } })}
                    />
                  </Field>
                ))}
                <Field
                  label="Bill amount"
                  htmlFor={`${id}-${b.key}-amount`}
                  error={noAmount ? "Enter the bill amount." : undefined}
                  hint={!noAmount && loaded.length === 1 && qtyHere > 0 && num(b.amount) > 0 ? `${formatINR(num(b.amount) / qtyHere)} a ${product(loaded[0].productId)?.unit ?? "bag"}` : undefined}
                >
                  <AffixInput
                    id={`${id}-${b.key}-amount`}
                    prefix="₹"
                    inputMode="decimal"
                    placeholder="0"
                    value={b.amount}
                    onChange={(e) => update(b.key, { amount: e.target.value })}
                    aria-invalid={noAmount || undefined}
                  />
                </Field>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" onClick={add} className="gap-1.5">
          <Plus size={18} strokeWidth={2} aria-hidden />
          Add bill
        </Button>
        <p className="text-[15px] text-ink-secondary">
          {bills.filter((b) => num(b.amount) > 0).length} {bills.filter((b) => num(b.amount) > 0).length === 1 ? "bill" : "bills"} ·{" "}
          <span className="font-semibold tabular-nums text-ink">{formatINR(billsTotal)}</span>
        </p>
      </div>
    </section>
  );
}
