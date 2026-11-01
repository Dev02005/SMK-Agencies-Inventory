"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { ItemLines, newLine, toNumber, type ItemLine } from "@/components/forms/item-lines";
import { Button } from "@/components/ui/button";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { Checkbox } from "@/components/ui/checkbox";
import type { Product } from "@/lib/data/types";
import { todayISO } from "@/lib/format";
import { addLorry } from "@/lib/lorry-book";
import { describeQuantities } from "@/lib/quantities";

/**
 * Notes a company lorry that is being sold straight off the truck (selling has usually started already). Company,
 * lorry number, driver and what's on the lorry are needed; the invoice number, the tick boxes and the sell-out days
 * are optional. Saved lorries show under Sales › Lorry sales and in New sale's "Load from"; their bags under
 * Stock › Lorry stock.
 */
export function LorryArrivalForm({ companies, products }: { companies: { id: string; name: string }[]; products: Product[] }) {
  const id = useId();
  const router = useRouter();
  const toast = useToast();
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [lorryNo, setLorryNo] = useState("");
  const [driver, setDriver] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [days, setDays] = useState("");
  const [paperKept, setPaperKept] = useState(false);
  const [unloading, setUnloading] = useState(false);
  const [lines, setLines] = useState<ItemLine[]>([newLine(1, products[0], 0)]);
  // The same item entered on two rows is added together.
  const loaded = Object.entries(
    lines.reduce<Record<string, number>>((sum, l) => (toNumber(l.qty) > 0 ? { ...sum, [l.productId]: (sum[l.productId] ?? 0) + toNumber(l.qty) } : sum), {}),
  ).map(([productId, qty]) => ({ productId, qty }));
  const missing = !companyId
    ? "Choose the company."
    : !lorryNo.trim()
      ? "Enter the lorry number."
      : !driver.trim()
        ? "Enter the driver's name."
        : loaded.length === 0
          ? "Enter what's on the lorry."
          : null;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (missing) return;
        const sellOutDays = Math.round(parseFloat(days));
        try {
          addLorry({
            companyId,
            companyName: companies.find((c) => c.id === companyId)?.name ?? "Company",
            lorryNo: lorryNo.trim(),
            driverName: driver.trim(),
            invoiceNo: invoiceNo.trim() || undefined,
            invoicePaperKept: paperKept,
            unloadingCharges: unloading,
            sellOutDays: sellOutDays > 0 ? sellOutDays : undefined,
            arrivedOn: todayISO(),
            lines: loaded,
          });
        } catch (error) {
          toast(error instanceof Error ? error.message : "Could not save the lorry.");
          return;
        }
        toast(`Lorry ${lorryNo.trim()} saved with ${describeQuantities(loaded, products)} on this device (sample mode). It shows under Lorry sales and in New sale.`);
        router.push("/sales/lorries");
      }}
    >
      <section className="surface space-y-4 p-5">
        <Field label="Company" htmlFor={`${id}-company`} hint="Who sent the lorry">
          <Select id={`${id}-company`} label="Company" value={companyId} onChange={setCompanyId} options={companies.map((c) => ({ value: c.id, label: c.name }))} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Invoice number" htmlFor={`${id}-invoice`} hint="Leave empty if you don't have it">
            <input id={`${id}-invoice`} className={inputClass} value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="Optional" />
          </Field>
          <Field label="Sells out in" htmlFor={`${id}-days`} hint="About how many days to sell the whole lorry">
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
        <ItemLines lines={lines} onChange={setLines} products={products} withRate={false} />
      </section>

      <div className="space-y-2">
        {missing && <p className="text-[13px] text-ink-secondary">{missing}</p>}
        <Button type="submit" disabled={Boolean(missing)} className="w-full sm:w-auto">
          Save lorry
        </Button>
      </div>
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
