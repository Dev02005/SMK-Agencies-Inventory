"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { FirmPicker, type FirmChoice } from "@/components/forms/firm-picker";
import { filledLines, ItemLines, toNumber, type ItemLine } from "@/components/forms/item-lines";
import { DatePicker } from "@/components/ui/date-picker";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { SubmitBar } from "@/components/ui/submit-bar";
import { useToast } from "@/components/ui/toast";
import type { Product } from "@/lib/data/types";
import { formatINR } from "@/lib/format";
import { mobileOf } from "@/lib/mobile";
import { describeQuantities } from "@/lib/quantities";
import { saveLorryPurchase } from "../actions";

/**
 * A lorry purchase: a company lorry bought to sell straight off the truck, laid out like a godown purchase (firm,
 * company, invoice date, lorry, items) but with the driver instead of a godown, and the invoice's total value instead
 * of a rate per bag. No freight is taken; the tick boxes and our sale invoice are filled when the sale is updated. The lorry is sold as a whole: once it is sold out, its sale is updated under Sales › Lorry sales, and
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
  const [receivedDate, setReceivedDate] = useState(today);
  const [lorryNo, setLorryNo] = useState("");
  const [driverMobile, setDriverMobile] = useState("");
  const [invoiceValue, setInvoiceValue] = useState("");

  const offeredBy = (supplierId: string) => {
    const brands = companies.find((c) => c.id === supplierId)?.brands;
    const theirs = brands?.length ? products.filter((p) => brands.includes(p.brand)) : [];
    return theirs.length ? theirs : products;
  };
  const offered = offeredBy(companyId);
  // No item picked for you: "Add item" asks the category, brand and item.
  const [lines, setLines] = useState<ItemLine[]>([]);

  const loaded = filledLines(lines).map((l: ItemLine) => ({ productId: l.productId, qty: toNumber(l.qty) }));
  const total = toNumber(invoiceValue);

  const missing = !firmId
    ? "Choose which firm this lorry is bought for."
    : !lorryNo.trim()
      ? "Enter the truck number."
      : mobileOf(driverMobile).length !== 10
        ? "Enter the driver's 10-digit mobile number."
          : loaded.length === 0
            ? "Enter what's on the lorry."
            : receivedDate < invoiceDate
              ? "The truck can't arrive before the invoice date."
              : null;

  function save() {
    if (missing || pending) return;
    startTransition(async () => {
      const result = await saveLorryPurchase({
        firmId,
        companyId,
        invoiceNo: invoiceNo.trim() || undefined,
        lorryNo,
        driverMobile,
        invoiceDate,
        receivedOn: receivedDate,
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
              // Start the items again for the new company.
              setLines([]);
            }}
            options={companies.map((c) => ({ value: c.id, label: c.name, hint: c.brands?.join(", ") }))}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Invoice number" htmlFor={`${id}-invno`} hint="From the company's invoice">
            <input
              id={`${id}-invno`}
              className={inputClass}
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder="e.g. INV-10492"
            />
          </Field>
          <Field label="Invoice date" htmlFor={`${id}-invdate`} hint="Selling starts from this day">
            <DatePicker id={`${id}-invdate`} label="Invoice date" value={invoiceDate} onChange={setInvoiceDate} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Truck number" htmlFor={`${id}-lorry`}>
            <input
              id={`${id}-lorry`}
              className={inputClass}
              value={lorryNo}
              onChange={(e) => setLorryNo(e.target.value.toUpperCase())}
              placeholder="AP 39 T 1234"
              autoCapitalize="characters"
            />
          </Field>
          <Field label="Truck received on" htmlFor={`${id}-recv`}>
            <DatePicker id={`${id}-recv`} label="Truck received on" value={receivedDate} onChange={setReceivedDate} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
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
