"use client";

import { Plus, X } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { AffixInput, Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import type { Product } from "@/lib/data/types";
import { formatINR, formatNumber } from "@/lib/format";
import { toMT, unitLabel } from "@/lib/sales";

export type ItemLine = { key: number; productId: string; qty: string; rate: string };

export const toNumber = (v: string) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);

export function newLine(key: number, product: Product, rate = product.listRate): ItemLine {
  return { key, productId: product.id, qty: "", rate: String(rate) };
}

/** Product / quantity (/ rate) rows used by purchases and stock inward. */
export function ItemLines({
  lines,
  onChange,
  products,
  withRate = true,
  rateFor = (p) => p.listRate,
}: {
  lines: ItemLine[];
  onChange: (lines: ItemLine[]) => void;
  products: Product[];
  withRate?: boolean;
  rateFor?: (product: Product) => number;
}) {
  const id = useId();
  const product = (pid: string) => products.find((p) => p.id === pid) ?? products[0];
  const update = (key: number, patch: Partial<ItemLine>) => onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  return (
    <>
      <ul className="divide-y divide-hairline">
        {lines.map((line, index) => {
          const p = product(line.productId);
          const qty = toNumber(line.qty);
          return (
            <li
              key={line.key}
              className={withRate ? "grid grid-cols-2 items-start gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_140px_130px_auto]" : "grid grid-cols-[minmax(0,1fr)_140px_auto] items-start gap-3 py-4"}
            >
              <Field label={`Item ${index + 1}`} htmlFor={`${id}-p-${line.key}`} className={withRate ? "col-span-2 sm:col-span-1" : undefined}>
                <Select
                  id={`${id}-p-${line.key}`}
                  label="Product"
                  value={line.productId}
                  onChange={(v) => update(line.key, { productId: v, rate: String(rateFor(product(v))) })}
                  options={products.map((x) => ({ value: x.id, label: x.name }))}
                />
              </Field>
              <Field label="Quantity" htmlFor={`${id}-q-${line.key}`} hint={qty > 0 ? `${formatNumber(toMT(qty, p.unit), 3)} MT` : undefined}>
                <AffixInput
                  id={`${id}-q-${line.key}`}
                  inputMode="decimal"
                  placeholder="0"
                  suffix={unitLabel[p.unit]}
                  value={line.qty}
                  onChange={(e) => update(line.key, { qty: e.target.value })}
                />
              </Field>
              {withRate && (
                <Field label={`Rate per ${p.unit}`} htmlFor={`${id}-r-${line.key}`} hint={qty > 0 ? formatINR(qty * toNumber(line.rate)) : undefined}>
                  <AffixInput
                    id={`${id}-r-${line.key}`}
                    prefix="₹"
                    inputMode="decimal"
                    value={line.rate}
                    onChange={(e) => update(line.key, { rate: e.target.value })}
                  />
                </Field>
              )}
              <div className="flex h-full items-start pt-[26px]">
                {lines.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove item ${index + 1}`}
                    onClick={() => onChange(lines.filter((l) => l.key !== line.key))}
                    className="grid size-10 place-items-center rounded-full text-ink-secondary hover:bg-hairline"
                  >
                    <X size={17} strokeWidth={2} aria-hidden />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <Button
        variant="secondary"
        className="mt-1 w-full"
        onClick={() => onChange([...lines, newLine(Math.max(0, ...lines.map((l) => l.key)) + 1, products[0], rateFor(products[0]))])}
      >
        <Plus size={18} strokeWidth={2} aria-hidden /> Add item
      </Button>
    </>
  );
}
