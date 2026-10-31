"use client";

import { useId, useState } from "react";
import { ItemLines, newLine, toNumber, type ItemLine } from "@/components/forms/item-lines";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { SubmitBar } from "@/components/ui/submit-bar";
import { sampleSaveMessage, useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import type { Godown, Product } from "@/lib/data/types";
import { formatNumber } from "@/lib/format";
import { sumQuantities } from "@/lib/quantities";

type PurchaseOption = {
  id: string;
  label: string;
  lorryNo: string;
  godownId: string;
  lines: { productId: string; qty: number }[];
};

/** Records what physically came off the lorry; quantities can differ from the invoice (shortages, damage). */
export function InwardForm({
  purchases,
  products,
  godowns,
  today,
}: {
  purchases: PurchaseOption[];
  products: Product[];
  godowns: Godown[];
  today: string;
}) {
  const id = useId();
  const toast = useToast();
  const [purchaseId, setPurchaseId] = useState("");
  const [godownId, setGodownId] = useState(godowns[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [lorryNo, setLorryNo] = useState("");
  const [lines, setLines] = useState<ItemLine[]>([newLine(1, products[0])]);
  const [handling, setHandling] = useState("");
  const [notes, setNotes] = useState("");

  function choosePurchase(value: string) {
    setPurchaseId(value);
    const p = purchases.find((x) => x.id === value);
    if (!p) return;
    setLorryNo(p.lorryNo);
    setGodownId(p.godownId);
    setLines(p.lines.map((l, i) => ({ key: i + 1, productId: l.productId, qty: String(l.qty), rate: "0" })));
  }

  const qty = sumQuantities(
    lines.map((l) => ({ productId: l.productId, qty: toNumber(l.qty) })),
    products,
  );
  const missing = !lines.some((l) => toNumber(l.qty) > 0) ? "Enter the quantity unloaded." : !lorryNo.trim() ? "Enter the lorry number." : null;
  const save = () => !missing && toast(sampleSaveMessage("stock inward"));

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <section className="surface space-y-4 p-5">
        <Field label="Against purchase" htmlFor={`${id}-purchase`} hint="Fills in the lorry and items from the invoice">
          <Select
            id={`${id}-purchase`}
            label="Against purchase"
            value={purchaseId}
            onChange={choosePurchase}
            options={[{ value: "", label: "No purchase (transfer or other)" }, ...purchases.map((p) => ({ value: p.id, label: p.label }))]}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Lorry number" htmlFor={`${id}-lorry`}>
            <input id={`${id}-lorry`} className={inputClass} value={lorryNo} onChange={(e) => setLorryNo(e.target.value.toUpperCase())} />
          </Field>
          <Field label="Godown" htmlFor={`${id}-godown`}>
            <Select id={`${id}-godown`} label="Godown" value={godownId} onChange={setGodownId} options={godowns.map((g) => ({ value: g.id, label: g.name }))} />
          </Field>
          <Field label="Unloaded on" htmlFor={`${id}-date`}>
            <input id={`${id}-date`} type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="text-[17px] font-semibold tracking-[-0.3px] text-ink">Unloaded</h2>
        <ItemLines lines={lines} onChange={setLines} products={products} withRate={false} />
        <p className="mt-3 text-[13px] text-ink-secondary">
          {formatNumber(qty.bags)} bags ({formatNumber(qty.cementMT)} MT) · {formatNumber(qty.kg)} kg ({formatNumber(qty.steelMT)} MT)
        </p>
      </section>

      <section className="surface space-y-4 p-5">
        <Field label="Unloading / handling charges" htmlFor={`${id}-handling`}>
          <AffixInput id={`${id}-handling`} prefix="₹" inputMode="decimal" placeholder="0" value={handling} onChange={(e) => setHandling(e.target.value)} />
        </Field>
        <Field label="Quality notes" htmlFor={`${id}-notes`} hint="Torn bags, wet cement, short weight…">
          <textarea id={`${id}-notes`} rows={3} className={cn(inputClass, "h-auto py-3")} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </section>

      <SubmitBar label="Save inward" disabled={Boolean(missing)} hint={missing} onSubmit={save} />
    </form>
  );
}
