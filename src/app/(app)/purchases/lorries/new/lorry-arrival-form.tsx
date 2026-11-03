"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { FirmPicker, type FirmChoice } from "@/components/forms/firm-picker";
import { ItemLines, newLine, toNumber, type ItemLine } from "@/components/forms/item-lines";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { SubmitBar } from "@/components/ui/submit-bar";
import { useToast } from "@/components/ui/toast";
import type { Product } from "@/lib/data/types";
import { formatINR } from "@/lib/format";
import { addLorry } from "@/lib/lorry-book";
import { describeQuantities } from "@/lib/quantities";

/**
 * A lorry purchase: a company lorry bought to sell straight off the truck, laid out like a godown purchase (firm,
 * company, invoice, lorry, items) but with the driver instead of a godown. Selling has usually started already, so
 * only the firm, company, lorry number, driver and the bags are needed; the invoice, rates, freight, tick boxes and
 * sell-out days can be filled in when known. Saved lorries show under Purchases › Lorry, Sales › Lorry sales and
 * New sale's "Load from"; their bags under Stock › Lorry stock.
 */
export function LorryArrivalForm({
  firms,
  companies,
  products,
  today,
}: {
  firms: FirmChoice[];
  /** Suppliers; `brands` limits the items to what that company sells. */
  companies: { id: string; name: string; brands?: string[] }[];
  products: Product[];
  /** "YYYY-MM-DD", from the server so it matches between server and browser. */
  today: string;
}) {
  const id = useId();
  const router = useRouter();
  const toast = useToast();
  // With more than one firm nothing is picked, so the firm is always chosen on purpose.
  const [firmId, setFirmId] = useState(firms.length === 1 ? firms[0].id : "");
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [arrivedOn, setArrivedOn] = useState(today);
  const [lorryNo, setLorryNo] = useState("");
  const [driver, setDriver] = useState("");
  const [days, setDays] = useState("");
  const [paperKept, setPaperKept] = useState(false);
  const [unloading, setUnloading] = useState(false);
  const [freight, setFreight] = useState("");

  const offeredBy = (supplierId: string) => {
    const brands = companies.find((c) => c.id === supplierId)?.brands;
    const theirs = brands?.length ? products.filter((p) => brands.includes(p.brand)) : [];
    return theirs.length ? theirs : products;
  };
  const offered = offeredBy(companyId);
  // Purchase rates differ from selling rates, so each line starts empty rather than at the list rate.
  const [lines, setLines] = useState<ItemLine[]>([newLine(1, offered[0], 0)]);

  // The same item on two rows is added together; its rate is the first one given.
  const loaded = Object.values(
    lines.reduce<Record<string, { productId: string; qty: number; rate: number }>>((sum, l) => {
      const qty = toNumber(l.qty);
      if (qty <= 0) return sum;
      const was = sum[l.productId];
      return { ...sum, [l.productId]: { productId: l.productId, qty: (was?.qty ?? 0) + qty, rate: was?.rate || toNumber(l.rate) } };
    }, {}),
  );
  const itemsTotal = lines.reduce((s, l) => s + toNumber(l.qty) * toNumber(l.rate), 0);
  const total = itemsTotal + toNumber(freight);

  const missing = !firmId
    ? "Choose which firm this lorry is bought for."
    : !lorryNo.trim()
      ? "Enter the lorry number."
      : !driver.trim()
        ? "Enter the driver's name."
        : loaded.length === 0
          ? "Enter what's on the lorry."
          : arrivedOn < invoiceDate
            ? "The lorry can't arrive before the invoice date."
            : null;

  function save() {
    if (missing) return;
    const sellOutDays = Math.round(parseFloat(days));
    try {
      addLorry({
        firmId,
        companyId,
        companyName: companies.find((c) => c.id === companyId)?.name ?? "Company",
        lorryNo: lorryNo.trim(),
        driverName: driver.trim(),
        invoiceNo: invoiceNo.trim() || undefined,
        invoiceDate,
        invoicePaperKept: paperKept,
        unloadingCharges: unloading,
        sellOutDays: sellOutDays > 0 ? sellOutDays : undefined,
        arrivedOn,
        lines: loaded.map((l) => (l.rate > 0 ? l : { productId: l.productId, qty: l.qty })),
        freight: toNumber(freight) || undefined,
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save the lorry.");
      return;
    }
    toast(`Lorry ${lorryNo.trim()} saved with ${describeQuantities(loaded, products)} on this device (sample mode).`);
    router.push("/purchases/lorries");
  }

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
          <h2 className="px-1 text-[15px] font-semibold text-ink">Lorry bought for which firm?</h2>
          <FirmPicker label="Lorry bought for which firm" firms={firms} value={firmId} onChange={setFirmId} />
        </section>
      )}

      <section className="surface space-y-4 p-5">
        <Field label="Company" htmlFor={`${id}-company`} hint="The cement or steel company that sent the lorry">
          <Select
            id={`${id}-company`}
            label="Company"
            value={companyId}
            onChange={(next) => {
              setCompanyId(next);
              // Start the items again with what the new company sells.
              setLines([newLine(1, offeredBy(next)[0], 0)]);
            }}
            options={companies.map((c) => ({ value: c.id, label: c.name, hint: c.brands?.join(", ") }))}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Invoice no." htmlFor={`${id}-invoice`} hint="Leave empty if you don't have it">
            <input id={`${id}-invoice`} className={inputClass} value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="Optional" />
          </Field>
          <Field label="Invoice date" htmlFor={`${id}-invdate`}>
            <DatePicker id={`${id}-invdate`} label="Invoice date" value={invoiceDate} onChange={setInvoiceDate} />
          </Field>
          <Field label="Lorry arrived on" htmlFor={`${id}-arrived`}>
            <DatePicker id={`${id}-arrived`} label="Lorry arrived on" value={arrivedOn} onChange={setArrivedOn} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Lorry number" htmlFor={`${id}-lorry`}>
            <input
              id={`${id}-lorry`}
              className={inputClass}
              value={lorryNo}
              onChange={(e) => setLorryNo(e.target.value.toUpperCase())}
              placeholder="AP 39 T 1234"
              autoCapitalize="characters"
            />
          </Field>
          <Field label="Driver name" htmlFor={`${id}-driver`}>
            <input id={`${id}-driver`} className={inputClass} value={driver} onChange={(e) => setDriver(e.target.value)} autoCapitalize="words" />
          </Field>
          <Field label="Sells out in" htmlFor={`${id}-days`} hint="About how many days">
            <AffixInput id={`${id}-days`} inputMode="numeric" placeholder="2" suffix="days" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} />
          </Field>
        </div>
        <div className="space-y-1">
          <Tick checked={paperKept} onChange={setPaperKept} label="We have the invoice paper" hint="The physical invoice is kept with us" />
          <Tick checked={unloading} onChange={setUnloading} label="Unloading charges" hint="Unloading is charged for this lorry" />
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="text-[17px] font-semibold tracking-[-0.3px] text-ink">On the lorry</h2>
        <p className="mt-0.5 text-[13px] text-ink-secondary">Bags and the rate on the company&apos;s invoice; the rate can be added later.</p>
        <ItemLines lines={lines} onChange={setLines} products={offered} rateFor={() => 0} />
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

      <SubmitBar label="Save lorry purchase" disabled={Boolean(missing)} hint={missing ?? undefined} summary={{ label: "Total", value: formatINR(total) }} onSubmit={save} />
    </form>
  );
}

function Tick({ checked, onChange, label, hint }: { checked: boolean; onChange: (checked: boolean) => void; label: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl px-1 py-2 hover:bg-card-subtle">
      <Checkbox className="mt-0.5" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-[15px] text-ink">{label}</span>
        <span className="block text-[13px] text-ink-secondary">{hint}</span>
      </span>
    </label>
  );
}
