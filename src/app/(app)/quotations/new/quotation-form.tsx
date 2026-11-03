"use client";

import { Plus, X } from "lucide-react";
import { useId, useState } from "react";
import { ProductPicker } from "@/components/forms/product-picker";
import { IconButton } from "@/components/ui/button";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { SubmitBar } from "@/components/ui/submit-bar";
import { sampleSaveMessage, useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/data/types";
import { formatINR } from "@/lib/format";
import { unitLabel } from "@/lib/sales";

type Client = { id: string; name: string; place?: string; gstin?: string; mobile?: string; email?: string };
type Line = { key: number; productId: string; qty: string; rate: string };

const num = (v: string) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);

export function QuotationForm({
  clients,
  products,
  today,
  quoteNo,
  terms: defaultTerms,
}: {
  clients: Client[];
  products: Product[];
  today: string;
  quoteNo: string;
  terms: string[];
}) {
  const id = useId();
  const toast = useToast();
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [gstin, setGstin] = useState("");
  const [site, setSite] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState(today);
  const [lines, setLines] = useState<Line[]>([{ key: 1, productId: products[0].id, qty: "", rate: String(products[0].listRate) }]);
  const [nextKey, setNextKey] = useState(2);
  const [terms, setTerms] = useState(defaultTerms.join("\n"));

  const product = (pid: string) => products.find((p) => p.id === pid) ?? products[0];
  const total = lines.reduce((s, l) => s + num(l.qty) * num(l.rate), 0);
  const missing = !clientName.trim()
    ? "Choose or type the client's name."
    : !lines.some((l) => num(l.qty) > 0)
      ? "Enter a quantity for at least one item."
      : null;

  function chooseClient(value: string) {
    setClientId(value);
    const c = clients.find((x) => x.id === value);
    setClientName(c?.name ?? "");
    setGstin(c?.gstin ?? "");
    setSite(c?.place ?? "");
    setContact(c?.mobile ?? "");
    setEmail(c?.email ?? "");
  }

  function save() {
    if (!missing) toast(sampleSaveMessage(`quotation ${quoteNo}`));
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <section className="surface space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quote no." htmlFor={`${id}-no`} hint="Numbered within the financial year">
            <input id={`${id}-no`} className={inputClass} value={quoteNo} readOnly />
          </Field>
          <Field label="Date" htmlFor={`${id}-date`}>
            <DatePicker id={`${id}-date`} label="Date" value={date} onChange={setDate} />
          </Field>
        </div>
        <Field label="Existing party" htmlFor={`${id}-client`} hint="Or leave this and type a new client below">
          <Select
            id={`${id}-client`}
            label="Existing party"
            value={clientId}
            onChange={chooseClient}
            options={[{ value: "", label: "New client" }, ...clients.map((c) => ({ value: c.id, label: c.name, hint: c.place }))]}
          />
        </Field>
        <Field label="Client's name" htmlFor={`${id}-name`}>
          <input id={`${id}-name`} className={inputClass} value={clientName} onChange={(e) => setClientName(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="GSTIN" htmlFor={`${id}-gstin`}>
            <input id={`${id}-gstin`} className={cn(inputClass, "uppercase")} value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} />
          </Field>
          <Field label="Site address" htmlFor={`${id}-site`}>
            <input id={`${id}-site`} className={inputClass} value={site} onChange={(e) => setSite(e.target.value)} />
          </Field>
          <Field label="Contact no." htmlFor={`${id}-contact`}>
            <input id={`${id}-contact`} inputMode="tel" className={inputClass} value={contact} onChange={(e) => setContact(e.target.value)} />
          </Field>
          <Field label="E-mail" htmlFor={`${id}-email`}>
            <input id={`${id}-email`} type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="text-[17px] font-semibold tracking-[-0.3px] text-ink">Items</h2>
        <ul className="divide-y divide-hairline">
          {lines.map((line, index) => {
            const p = product(line.productId);
            return (
              <li key={line.key} className="grid grid-cols-2 items-end gap-3 py-4 sm:grid-cols-[150px_150px_minmax(0,1fr)]">
                <div className="col-span-2 sm:col-span-3">
                  <ProductPicker
                    label={`Item ${index + 1}`}
                    products={products}
                    value={line.productId}
                    onChange={(v) => setLines((ls) => ls.map((l) => (l.key === line.key ? { ...l, productId: v, rate: String(product(v).listRate) } : l)))}
                  />
                </div>
                <Field label="Quantity" htmlFor={`${id}-q-${line.key}`}>
                  <AffixInput
                    id={`${id}-q-${line.key}`}
                    inputMode="decimal"
                    suffix={unitLabel[p.unit]}
                    value={line.qty}
                    onChange={(e) => setLines((ls) => ls.map((l) => (l.key === line.key ? { ...l, qty: e.target.value } : l)))}
                  />
                </Field>
                <Field label="Price" htmlFor={`${id}-r-${line.key}`}>
                  <AffixInput
                    id={`${id}-r-${line.key}`}
                    prefix="₹"
                    inputMode="decimal"
                    value={line.rate}
                    onChange={(e) => setLines((ls) => ls.map((l) => (l.key === line.key ? { ...l, rate: e.target.value } : l)))}
                  />
                </Field>
                <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:mb-3 sm:justify-end">
                  <span className="text-[15px] font-medium tabular-nums text-ink">{formatINR(num(line.qty) * num(line.rate))}</span>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Remove item ${index + 1}`}
                      onClick={() => setLines((ls) => ls.filter((l) => l.key !== line.key))}
                      className="grid size-9 place-items-center rounded-full text-ink-secondary hover:bg-hairline"
                    >
                      <X size={17} strokeWidth={2} aria-hidden />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <IconButton
          label="Add item"
          className="mt-1"
          onClick={() => {
            setLines((ls) => [...ls, { key: nextKey, productId: products[0].id, qty: "", rate: String(products[0].listRate) }]);
            setNextKey((k) => k + 1);
          }}
        >
          <Plus size={20} strokeWidth={2} aria-hidden />
        </IconButton>
        <div className="mt-4 flex items-baseline justify-between border-t border-hairline pt-4">
          <span className="text-[15px] text-ink-secondary">Grand total</span>
          <span className="text-[28px] font-semibold tabular-nums tracking-[-0.4px] text-ink">{formatINR(total)}</span>
        </div>
      </section>

      <section className="surface p-5">
        <Field label="Terms and conditions" htmlFor={`${id}-terms`} hint="One term per line; printed as a numbered list">
          <textarea id={`${id}-terms`} rows={4} className={cn(inputClass, "h-auto py-3 text-[16px]")} value={terms} onChange={(e) => setTerms(e.target.value)} />
        </Field>
      </section>

      <SubmitBar label="Save quotation" disabled={Boolean(missing)} hint={missing} summary={{ label: "Grand total", value: formatINR(total) }} onSubmit={save} />
    </form>
  );
}
