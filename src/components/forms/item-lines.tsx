"use client";

import { Plus, X } from "lucide-react";
import { useId } from "react";
import { ProductPicker } from "@/components/forms/product-picker";
import { Button, IconButton } from "@/components/ui/button";
import { AffixInput, Field } from "@/components/ui/field";
import type { Product } from "@/lib/data/types";
import { formatINR, formatNumber } from "@/lib/format";
import { toMT, unitLabel } from "@/lib/sales";

export type ItemLine = { key: number; productId: string; qty: string; rate: string };

export const toNumber = (v: string) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);

/** Only lines with a positive quantity entered. */
export const filledLines = (lines: ItemLine[]): ItemLine[] => lines.filter((l) => toNumber(l.qty) > 0);

/** A new row; products have no fixed rate, so the rate starts empty. */
export function newLine(key: number, product: Product): ItemLine {
  return { key, productId: product?.id ?? "", qty: "", rate: "" };
}

/** Item (cement or steel, brand, type) / quantity (/ rate) rows used by purchases and orders. */
export function ItemLines({
  lines,
  onChange,
  products,
  withRate = true,
}: {
  lines: ItemLine[];
  onChange: (lines: ItemLine[]) => void;
  products: Product[];
  withRate?: boolean;
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
            <li key={line.key} className="space-y-3 py-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <ProductPicker
                    label={`Item ${index + 1}`}
                    products={products}
                    value={line.productId}
                    onChange={(v) => update(line.key, { productId: v, rate: "" })}
                  />
                </div>
                {lines.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove item ${index + 1}`}
                    onClick={() => onChange(lines.filter((l) => l.key !== line.key))}
                    className="grid size-10 shrink-0 place-items-center rounded-full text-ink-secondary hover:bg-hairline"
                  >
                    <X size={17} strokeWidth={2} aria-hidden />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity" htmlFor={`${id}-q-${line.key}`} hint={qty > 0 && toMT(qty, p.unit) > 0 ? `${formatNumber(toMT(qty, p.unit), 3)} MT` : undefined}>
                  <AffixInput
                    id={`${id}-q-${line.key}`}
                    inputMode="decimal"
                    placeholder="0"
                    suffix={unitLabel[p.unit] || p.unit}
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
              </div>
            </li>
          );
        })}
      </ul>
      {lines.length === 0 ? (
        <Button
          type="button"
          variant="secondary"
          className="mt-2 gap-1.5"
          onClick={() => onChange([newLine(1, products[0])])}
        >
          <Plus size={18} strokeWidth={2.25} aria-hidden />
          Add item
        </Button>
      ) : (
        <IconButton
          label="Add item"
          className="mt-1"
          onClick={() => onChange([...lines, newLine(Math.max(0, ...lines.map((l) => l.key)) + 1, products[0])])}
        >
          <Plus size={20} strokeWidth={2} aria-hidden />
        </IconButton>
      )}
    </>
  );
}
