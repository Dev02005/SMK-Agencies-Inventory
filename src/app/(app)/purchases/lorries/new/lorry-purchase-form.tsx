"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { FirmPicker, type FirmChoice } from "@/components/forms/firm-picker";
import { ItemLines, newLine, toNumber, type ItemLine } from "@/components/forms/item-lines";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { SubmitBar } from "@/components/ui/submit-bar";
import { useToast } from "@/components/ui/toast";
import type { Product } from "@/lib/data/types";
import { addDaysISO, formatDate, formatINR } from "@/lib/format";
import { describeQuantities } from "@/lib/quantities";
import { saveLorryPurchase } from "../actions";

/**
 * A lorry purchase: a company lorry bought to sell straight off the truck, laid out like a godown purchase (firm,
 * company, invoice, lorry, items) but with the driver instead of a godown, and the invoice's total value instead of a
 * rate per bag. No freight is taken. The lorry is sold as a whole: once it is sold out, its sale is updated under Sales › Lorry sales, and
 * Home reminds the owner when that is late.
 */
export function LorryPurchaseForm({
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
  const [pending, startTransition] = useTransition();
  // With more than one firm nothing is picked, so the firm is always chosen on purpose.
  const [firmId, setFirmId] = useState(firms.length === 1 ? firms[0].id : "");
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [lorryNo, setLorryNo] = useState("");
  const [driver, setDriver] = useState("");
  const [days, setDays] = useState("");
  const [paperKept, setPaperKept] = useState(false);
  const [unloading, setUnloading] = useState(false);
  const [invoiceValue, setInvoiceValue] = useState("");

  const offeredBy = (supplierId: string) => {
    const brands = companies.find((c) => c.id === supplierId)?.brands;
    const theirs = brands?.length ? products.filter((p) => brands.includes(p.brand)) : [];
    return theirs.length ? theirs : products;
  };
  const offered = offeredBy(companyId);
  const [lines, setLines] = useState<ItemLine[]>([newLine(1, offered[0])]);

  const loaded = lines.map((l) => ({ productId: l.productId, qty: toNumber(l.qty) })).filter((l) => l.qty > 0);
  const total = toNumber(invoiceValue);
  const sellOutDays = parseInt(days, 10);

  const missing = !firmId
    ? "Choose which firm this lorry is bought for."
    : !lorryNo.trim()
      ? "Enter the lorry number."
      : !driver.trim()
        ? "Enter the driver's name."
        : !(sellOutDays >= 1 && sellOutDays <= 60)
          ? "Enter about how many days it takes to sell out."
          : loaded.length === 0
            ? "Enter what's on the lorry."
            : null;

  function save() {
    if (missing || pending) return;
    startTransition(async () => {
      const result = await saveLorryPurchase({
        firmId,
        companyId,
        lorryNo,
        driverName: driver,
        invoiceNo,
        invoiceDate,
        invoicePaperKept: paperKept,
        unloadingCharges: unloading,
        sellOutDays,
        lines: loaded,
        invoiceValue: toNumber(invoiceValue),
      });
      if (!result.ok) {
        toast(result.problem);
        return;
      }
      toast(`Lorry ${lorryNo.trim().toUpperCase()} saved with ${describeQuantities(loaded, products)}.`);
      router.push("/purchases/lorries");
    });
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
              setLines([newLine(1, offeredBy(next)[0])]);
            }}
            options={companies.map((c) => ({ value: c.id, label: c.name, hint: c.brands?.join(", ") }))}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Invoice no." htmlFor={`${id}-invoice`} hint="Leave empty if you don't have it">
            <input id={`${id}-invoice`} className={inputClass} value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="Optional" />
          </Field>
          <Field label="Invoice date" htmlFor={`${id}-invdate`} hint="Selling starts from this day">
            <DatePicker id={`${id}-invdate`} label="Invoice date" value={invoiceDate} onChange={setInvoiceDate} />
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
          <Field
            label="Sells out in"
            htmlFor={`${id}-days`}
            hint={sellOutDays >= 1 && sellOutDays <= 60 ? `Update the sale by ${formatDate(addDaysISO(invoiceDate, sellOutDays))}` : "About how many days"}
          >
            <AffixInput id={`${id}-days`} inputMode="numeric" placeholder="2" suffix="days" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, "").slice(0, 2))} />
          </Field>
        </div>
        <div className="space-y-1">
          <Tick checked={paperKept} onChange={setPaperKept} label="Physical invoice paper copy" hint="We have the paper copy of the company's invoice" />
          <Tick checked={unloading} onChange={setUnloading} label="Unloading charges" hint="Unloading charges are paid to us" />
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="text-[17px] font-semibold tracking-[-0.3px] text-ink">On the lorry</h2>
        <p className="mt-0.5 text-[13px] text-ink-secondary">The bags (or kg) that came on it.</p>
        <ItemLines lines={lines} onChange={setLines} products={offered} withRate={false} />
        <div className="mt-4 border-t border-hairline pt-4">
          <Field label="Total invoice value" htmlFor={`${id}-value`} hint="The total on the company's invoice">
            <AffixInput id={`${id}-value`} prefix="₹" inputMode="decimal" placeholder="0" value={invoiceValue} onChange={(e) => setInvoiceValue(e.target.value)} />
          </Field>
        </div>
      </section>

      <SubmitBar
        label={pending ? "Saving…" : "Save lorry purchase"}
        disabled={Boolean(missing) || pending}
        hint={missing ?? undefined}
        summary={{ label: "Total", value: formatINR(total) }}
        onSubmit={save}
      />
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
