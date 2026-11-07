"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { SubmitBar } from "@/components/ui/submit-bar";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import type { Lorry, Product } from "@/lib/data/types";
import { formatINR, formatNumber } from "@/lib/format";
import type { SaleParty } from "@/app/(app)/sales/new/new-sale-form";
import { chargesTotal, OtherCharges, toChargeRows, unnamedCharge, type OtherCharge } from "@/components/forms/other-charges";
import { billUsed, emptyBill, num, SoldInBills, type BillRow } from "./sold-in-bills";
import { updateLorrySale } from "../../../purchases/lorries/actions";

const text = (n: number | undefined) => (n ? String(n) : "");

/**
 * Updating a company lorry's sale: each sale bill from it (number, who bought, the bags on it and its amount), with what
 * is left on the lorry; the tick boxes, charges received (each other charge named), and whether it is sold out. It can be saved while still
 * selling and updated again later; marking it sold out ends the reminder.
 */
export function LorrySaleForm({
  lorry,
  products,
  today,
  nextBillNo,
  parties = [],
}: {
  lorry: Lorry;
  products: Product[];
  today: string;
  nextBillNo: number;
  parties?: SaleParty[];
}) {
  const id = useId();
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  // The bills saved before. An update from before bills (one invoice, or places) opens as rows to finish; else one empty bill.
  const [bills, setBills] = useState<BillRow[]>(() => {
    const toQty = (lines: { productId: string; qty: number }[]) => Object.fromEntries(lines.map((l) => [l.productId, l.qty ? String(l.qty) : ""]));
    const sale = lorry.sale;
    const was = sale?.updatedOn ?? today;
    if (sale?.bills?.length)
      return sale.bills.map((b, i) => {
        const matched = parties.find(
          (p) => p.id === b.partyId || (b.soldTo && p.name.trim().toLowerCase() === b.soldTo.trim().toLowerCase()),
        );
        return {
          key: i + 1,
          date: b.date ?? was,
          billNo: b.billNo,
          partyId: b.partyId ?? matched?.id ?? "",
          soldTo: b.soldTo ?? matched?.name ?? "",
          cashName: b.cashName ?? (matched?.kind === "cash" ? b.soldTo : ""),
          cashMobile: b.cashMobile ?? matched?.mobile ?? "",
          place: b.place ?? matched?.place ?? "",
          customMode: Boolean(b.soldTo && !matched && !b.partyId),
          qty: toQty(b.lines),
          amount: String(b.amount),
        };
      });
    if (sale?.drops?.length) return sale.drops.map((d, i) => ({ ...emptyBill(i + 1, was), soldTo: d.place, qty: toQty(d.lines), amount: sale.drops!.length === 1 && sale.invoiceValue ? String(sale.invoiceValue) : "" }));
    if (sale?.lines.some((l) => l.qty > 0)) return [{ key: 1, date: was, billNo: sale.invoiceNo ?? "", soldTo: "", qty: toQty(sale.lines), amount: sale.invoiceValue ? String(sale.invoiceValue) : "" }];
    return [emptyBill(1, today)];
  });
  const lines = lorry.lines.map((l) => ({ productId: l.productId, loaded: l.qty, sold: bills.reduce((s, b) => s + num(b.qty[l.productId]), 0) }));
  const billsTotal = bills.reduce((s, b) => s + num(b.amount), 0);
  // Total invoice value: the bills added up, unless it is typed in (when the invoice's total differs from them).
  const savedValue = lorry.sale?.invoiceValue;
  const savedBills = (lorry.sale?.bills ?? []).reduce((s, b) => s + b.amount, 0);
  const [invoiceTyped, setInvoiceTyped] = useState<string | null>(savedValue !== undefined && lorry.sale?.bills?.length && savedValue !== savedBills ? String(savedValue) : null);
  const invoiceValue = invoiceTyped !== null ? num(invoiceTyped) : billsTotal;
  const [paperKept, setPaperKept] = useState(lorry.invoicePaperKept);
  const [unloadingPaid, setUnloadingPaid] = useState(lorry.unloadingCharges);
  const [unloading, setUnloading] = useState(text(lorry.sale?.unloading));
  // Other charges received, each named; an older single "Other" amount opens as one row to name.
  const [others, setOthers] = useState<OtherCharge[]>(() =>
    lorry.sale?.others?.length ? toChargeRows(lorry.sale.others) : lorry.sale?.other ? [{ key: 1, name: "", amount: String(lorry.sale.other) }] : [],
  );
  const [notes, setNotes] = useState(lorry.sale?.notes ?? lorry.sold?.notes ?? "");
  const [status, setStatus] = useState<"selling" | "sold">(lorry.sold ? "sold" : "selling");
  const [soldOn, setSoldOn] = useState(lorry.sold?.on ?? today);

  const product = (pid: string) => products.find((p) => p.id === pid);
  const total = invoiceValue + (unloadingPaid ? num(unloading) : 0) + chargesTotal(others);
  const margin = lorry.invoiceValue ? total - lorry.invoiceValue : undefined;

  const over = lines.find((l) => l.sold > l.loaded);
  const used = bills.filter(billUsed);
  const qtyOn = (b: BillRow) => lorry.lines.reduce((s, l) => s + num(b.qty[l.productId]), 0);
  const missing = over
    ? `Sold can't be more than came on the lorry (${formatNumber(over.loaded)} ${product(over.productId)?.unit === "kg" ? "kg" : "bags"}).`
    : used.some((b) => qtyOn(b) === 0)
      ? "Enter how much is on each bill."
    : used.some((b) => !(num(b.amount) > 0))
      ? "Enter the amount of each bill."
    : lines.some((l) => l.sold > 0) && !(invoiceValue > 0)
      ? "Enter the total invoice value."
    : unnamedCharge(others)
      ? "Enter a name for each other charge."
      : status === "sold" && !(total > 0)
        ? "Enter what was sold before marking it sold out."
        : status === "sold" && soldOn < lorry.invoiceDate
          ? "It can't sell out before the invoice date."
          : null;

  function save() {
    if (missing || pending) return;
    startTransition(async () => {
      const result = await updateLorrySale(lorry.id, {
        bills: used.map((b) => ({
          date: b.date,
          billNo: b.billNo,
          partyId: b.partyId,
          soldTo: b.soldTo,
          cashName: b.cashName,
          cashMobile: b.cashMobile,
          place: b.place,
          amount: num(b.amount),
          lines: lorry.lines.map((l) => ({ productId: l.productId, qty: num(b.qty[l.productId]) })),
        })),
        invoiceValue,
        invoicePaperKept: paperKept,
        unloadingCharges: unloadingPaid,
        unloading: num(unloading),
        others: others.map((c) => ({ name: c.name, amount: num(c.amount) })),
        notes,
        soldOut: status === "sold",
        soldOn,
      });
      if (!result.ok) {
        toast(result.problem);
        return;
      }
      const given = result.billNumbers?.length ? ` Bill ${result.billNumbers.join(", ")} saved.` : "";
      toast((status === "sold" ? `Lorry ${lorry.lorryNo} sold out: ${formatINR(total)}.` : `Lorry ${lorry.lorryNo} updated: ${formatINR(total)} so far.`) + given);
      router.push("/sales/lorries");
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
      <SoldInBills loaded={lorry.lines} products={products} bills={bills} onChange={setBills} today={today} seriesNext={nextBillNo} parties={parties} />

      <section className="surface space-y-4 p-5">
        <div className="space-y-1">
          <Tick checked={paperKept} onChange={setPaperKept} label="Physical invoice paper copy" hint="We have the paper copy of the company's invoice" />
          <Tick checked={unloadingPaid} onChange={setUnloadingPaid} label="Unloading charges" hint="Unloading charges are paid to us" />
        </div>
        <Field
          label="Total invoice value"
          htmlFor={`${id}-invvalue`}
          hint={
            invoiceTyped === null
              ? "The bills added up; change it if the invoice total is different"
              : `Typed in · the bills add up to ${formatINR(billsTotal)}`
          }
          className="max-w-[320px]"
        >
          <AffixInput
            id={`${id}-invvalue`}
            prefix="₹"
            inputMode="decimal"
            placeholder="0"
            value={invoiceTyped ?? (billsTotal ? String(billsTotal) : "")}
            onChange={(e) => setInvoiceTyped(e.target.value)}
          />
        </Field>
        {invoiceTyped !== null && (
          <Button variant="plain" onClick={() => setInvoiceTyped(null)} className="-mt-2">
            Use the bills&apos; total ({formatINR(billsTotal)})
          </Button>
        )}
        {unloadingPaid && (
          <Field label="Unloading charges received" htmlFor={`${id}-unloading`} className="max-w-[260px]">
            <AffixInput id={`${id}-unloading`} prefix="₹" inputMode="decimal" placeholder="0" value={unloading} onChange={(e) => setUnloading(e.target.value)} />
          </Field>
        )}
        <OtherCharges value={others} onChange={setOthers} title="Other charges received" hint="Optional. Name each one; they add to the sale value." />
        <Field label="Notes" htmlFor={`${id}-notes`} hint="Optional: who bought, anything to remember">
          <textarea id={`${id}-notes`} rows={2} maxLength={200} className={cn(inputClass, "h-auto py-3")} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </section>

      <section className="surface space-y-4 p-5">
        <Segmented
          label="Lorry status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "selling", label: "Still selling" },
            { value: "sold", label: "Sold out" },
          ]}
        />
        {status === "sold" ? (
          <Field label="Sold out on" htmlFor={`${id}-soldon`} hint="Marking it sold out ends the reminder">
            <DatePicker id={`${id}-soldon`} label="Sold out on" value={soldOn} onChange={setSoldOn} />
          </Field>
        ) : (
          <p className="text-[13px] text-ink-secondary">Saving now keeps it selling; update it again when it is sold out.</p>
        )}
        <dl className="space-y-1.5 border-t border-hairline pt-4 text-[15px]">
          <div className="flex justify-between">
            <dt className="text-ink-secondary">Total sale value</dt>
            <dd className="text-[22px] font-semibold tabular-nums text-ink">{formatINR(total)}</dd>
          </div>
          {lorry.invoiceValue ? (
            <>
              <div className="flex justify-between">
                <dt className="text-ink-secondary">Bought for (company invoice)</dt>
                <dd className="tabular-nums text-ink">{formatINR(lorry.invoiceValue)}</dd>
              </div>
              {/* Only when marking it sold out: while still selling, the sale so far is set against the whole invoice. */}
              {status === "sold" && (
                <div className="flex justify-between">
                  <dt className="text-ink-secondary">Margin</dt>
                  <dd className={cn("font-semibold tabular-nums", (margin ?? 0) >= 0 ? "text-good" : "text-danger")}>{formatINR(margin ?? 0)}</dd>
                </div>
              )}
            </>
          ) : null}
        </dl>
      </section>

      <SubmitBar
        label={pending ? "Saving…" : status === "sold" ? "Save as sold out" : "Save update"}
        disabled={Boolean(missing) || pending}
        hint={missing ?? undefined}
        summary={{ label: "Sale value", value: formatINR(total) }}
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
