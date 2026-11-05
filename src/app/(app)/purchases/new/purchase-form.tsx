"use client";

import { useId, useState } from "react";
import { FirmPicker, type FirmChoice } from "@/components/forms/firm-picker";
import { ItemLines, newLine, toNumber, type ItemLine } from "@/components/forms/item-lines";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { SubmitBar } from "@/components/ui/submit-bar";
import { sampleSaveMessage, useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import type { Godown, Product } from "@/lib/data/types";
import { formatINR } from "@/lib/format";
import { mobileOf } from "@/lib/mobile";
import { NewSupplier, type Supplier } from "./new-supplier";

/** Purchase invoice from a company, for one of the owner's firms; saving also brings the stock into the chosen godown. */
export function PurchaseForm({
  firms,
  companies,
  products,
  godowns,
  today,
}: {
  /** The owner's firms: the purchase is booked in the one picked first. */
  firms: FirmChoice[];
  /** Suppliers; `brands` limits the items to what that company sells. */
  companies: { id: string; name: string; brands?: string[] }[];
  products: Product[];
  godowns: Godown[];
  today: string;
}) {
  const id = useId();
  const toast = useToast();
  // With more than one firm nothing is picked, so the firm is always chosen on purpose.
  const [firmId, setFirmId] = useState(firms.length === 1 ? firms[0].id : "");
  // Suppliers added here join the list straight away.
  const [companyList, setCompanyList] = useState<Supplier[]>(companies);
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  // What was typed in the company search when "New supplier" was picked; null while that form is closed.
  const [newSupplier, setNewSupplier] = useState<string | null>(null);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [lorryNo, setLorryNo] = useState("");
  const [driverMobile, setDriverMobile] = useState("");
  const [godownId, setGodownId] = useState(godowns[0]?.id ?? "");
  const offeredBy = (supplierId: string) => {
    const brands = companyList.find((c) => c.id === supplierId)?.brands;
    const theirs = brands?.length ? products.filter((p) => brands.includes(p.brand)) : [];
    return theirs.length ? theirs : products;
  };
  const offered = offeredBy(companyId);
  const [lines, setLines] = useState<ItemLine[]>([newLine(1, offered[0])]);
  // One total from the company's invoice instead of a rate per bag.
  const [invoiceValue, setInvoiceValue] = useState("");
  const total = toNumber(invoiceValue);
  const missing = !firmId
    ? "Choose which firm this purchase is for."
    : !invoiceNo.trim()
    ? "Enter the company's invoice number."
    : mobileOf(driverMobile).length !== 10
    ? "Enter the driver's 10-digit mobile number."
    : !lines.some((l) => toNumber(l.qty) > 0)
      ? "Enter the quantity for at least one item."
      : !(total > 0)
        ? "Enter the total invoice value."
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
      {firms.length > 1 && (
        <section className="space-y-2">
          <h2 className="px-1 text-[15px] font-semibold text-ink">Purchase for which firm?</h2>
          <FirmPicker label="Purchase for which firm" firms={firms} value={firmId} onChange={setFirmId} />
        </section>
      )}
      <section className="surface space-y-4 p-5">
        <Field label="Company" htmlFor={`${id}-company`} hint="The cement or steel company that sold it">
          <Select
            id={`${id}-company`}
            label="Company"
            value={companyId}
            onChange={(next) => {
              setCompanyId(next);
              // Start the items again with what the new company sells.
              setLines([newLine(1, offeredBy(next)[0])]);
            }}
            options={companyList.map((c) => ({ value: c.id, label: c.name, hint: c.brands?.join(", ") }))}
            searchable
            action={{ label: "New supplier", onPick: setNewSupplier }}
          />
        </Field>
        {newSupplier !== null && (
          <NewSupplier
            typed={newSupplier}
            brands={[...new Set(products.map((p) => p.brand))].sort((a, b) => a.localeCompare(b))}
            onCancel={() => setNewSupplier(null)}
            onDone={(s) => {
              setCompanyList((list) => (list.some((c) => c.id === s.id) ? list : [...list, s]));
              setCompanyId(s.id);
              const brands = s.brands;
              const theirs = brands?.length ? products.filter((p) => brands.includes(p.brand)) : [];
              setLines([newLine(1, (theirs.length ? theirs : products)[0])]);
              setNewSupplier(null);
              toast(`${s.name} added as a supplier`);
            }}
          />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Invoice no." htmlFor={`${id}-inv`}>
            <input id={`${id}-inv`} className={inputClass} value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
          </Field>
          <Field label="Invoice date" htmlFor={`${id}-invdate`}>
            <DatePicker id={`${id}-invdate`} label="Invoice date" value={invoiceDate} onChange={setInvoiceDate} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Truck number" htmlFor={`${id}-lorry`}>
            <input
              id={`${id}-lorry`}
              className={inputClass}
              placeholder="AP 39 T 7781"
              value={lorryNo}
              onChange={(e) => setLorryNo(e.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Driver number" htmlFor={`${id}-driver`}>
            <AffixInput
              id={`${id}-driver`}
              prefix="+91"
              inputMode="numeric"
              autoComplete="off"
              value={driverMobile}
              onChange={(e) => setDriverMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
            />
          </Field>
          <Field label="Unload at" htmlFor={`${id}-godown`} hint="Its items go into this godown's stock">
            <Select id={`${id}-godown`} label="Unload at" value={godownId} onChange={setGodownId} options={godowns.map((g) => ({ value: g.id, label: g.name }))} />
          </Field>
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="text-[17px] font-semibold tracking-[-0.3px] text-ink">Items</h2>
        <ItemLines lines={lines} onChange={setLines} products={offered} withRate={false} />
        <div className="mt-4 border-t border-hairline pt-4">
          <Field label="Total invoice value" htmlFor={`${id}-value`} hint="The total on the company's invoice">
            <AffixInput id={`${id}-value`} prefix="₹" inputMode="decimal" placeholder="0" value={invoiceValue} onChange={(e) => setInvoiceValue(e.target.value)} />
          </Field>
        </div>
      </section>

      <SubmitBar label="Save purchase" disabled={Boolean(missing)} hint={missing} summary={{ label: "Invoice value", value: formatINR(total) }} onSubmit={save} />
    </form>
  );
}
