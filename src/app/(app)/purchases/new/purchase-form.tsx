"use client";

import { useId, useState } from "react";
import { ItemLines, newLine, toNumber, type ItemLine } from "@/components/forms/item-lines";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { SubmitBar } from "@/components/ui/submit-bar";
import { sampleSaveMessage, useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import type { Godown, Product } from "@/lib/data/types";
import { formatINR } from "@/lib/format";

/** Purchase invoice from a company; saving also brings the stock into the chosen godown. */
export function PurchaseForm({
  companies,
  products,
  godowns,
  today,
}: {
  companies: { id: string; name: string }[];
  products: Product[];
  godowns: Godown[];
  today: string;
}) {
  const id = useId();
  const toast = useToast();
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [receivedDate, setReceivedDate] = useState(today);
  const [lorryNo, setLorryNo] = useState("");
  const [godownId, setGodownId] = useState(godowns[0]?.id ?? "");
  const [freight, setFreight] = useState("");
  // Purchase rates differ from selling rates, so each line starts at 0 rather than the list rate.
  const [lines, setLines] = useState<ItemLine[]>([newLine(1, products[0], 0)]);

  const itemsTotal = lines.reduce((s, l) => s + toNumber(l.qty) * toNumber(l.rate), 0);
  const total = itemsTotal + toNumber(freight);
  const missing = !invoiceNo.trim()
    ? "Enter the company's invoice number."
    : !lines.some((l) => toNumber(l.qty) > 0 && toNumber(l.rate) > 0)
      ? "Enter quantity and rate for at least one item."
      : receivedDate < invoiceDate
        ? "The truck can't arrive before the invoice date."
        : null;

  const save = () => !missing && toast(sampleSaveMessage("purchase"));

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <section className="surface space-y-4 p-5">
        <Field label="Company" htmlFor={`${id}-company`}>
          <Select id={`${id}-company`} label="Company" value={companyId} onChange={setCompanyId} options={companies.map((c) => ({ value: c.id, label: c.name }))} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Invoice no." htmlFor={`${id}-inv`}>
            <input id={`${id}-inv`} className={inputClass} value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
          </Field>
          <Field label="Invoice date" htmlFor={`${id}-invdate`}>
            <DatePicker id={`${id}-invdate`} label="Invoice date" value={invoiceDate} onChange={setInvoiceDate} />
          </Field>
          <Field label="Truck received on" htmlFor={`${id}-recv`}>
            <DatePicker id={`${id}-recv`} label="Truck arrived on" value={receivedDate} onChange={setReceivedDate} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Lorry number" htmlFor={`${id}-lorry`}>
            <input
              id={`${id}-lorry`}
              className={inputClass}
              placeholder="AP 39 T 7781"
              value={lorryNo}
              onChange={(e) => setLorryNo(e.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Unload at" htmlFor={`${id}-godown`} hint="Its items go into this godown's stock">
            <Select id={`${id}-godown`} label="Unload at" value={godownId} onChange={setGodownId} options={godowns.map((g) => ({ value: g.id, label: g.name }))} />
          </Field>
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="text-[17px] font-semibold tracking-[-0.3px] text-ink">Items</h2>
        <ItemLines lines={lines} onChange={setLines} products={products} rateFor={() => 0} />
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 border-t border-hairline pt-4">
          <Field label="Freight paid on this lorry" htmlFor={`${id}-freight`}>
            <AffixInput id={`${id}-freight`} prefix="₹" inputMode="decimal" placeholder="0" value={freight} onChange={(e) => setFreight(e.target.value)} />
          </Field>
          <div className="pb-2 text-right">
            <p className="text-[13px] text-ink-secondary">Total</p>
            <p className="text-[22px] font-semibold tabular-nums text-ink">{formatINR(total)}</p>
          </div>
        </div>
      </section>

      <SubmitBar label="Save purchase" disabled={Boolean(missing)} hint={missing} summary={{ label: "Total", value: formatINR(total) }} onSubmit={save} />
    </form>
  );
}
