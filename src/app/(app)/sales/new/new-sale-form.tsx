"use client";

import { Plus, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { sampleSaveMessage, useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { formatINR, formatNumber } from "@/lib/format";
import {
  checkCredit,
  computeTotals,
  maxDiscountPercent,
  toMT,
  unitLabel,
  type CreditCheck,
  type DiscountMode,
  type TransportMode,
} from "@/lib/sales";
import type { Product, Role } from "@/lib/data/types";

export type SaleParty = {
  id: string;
  name: string;
  place?: string;
  creditLimit: number | null;
  outstanding: number;
};

type Line = { key: number; productId: string; qty: string; rate: string };
type Source = "godown" | "lorry" | "van";

const num = (value: string) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

const transportHelp: Record<TransportMode, string> = {
  FOR: "Our lorry delivers; freight is charged.",
  EX: "Customer's own vehicle; no transport charge.",
  RENT: "Hired vehicle; enter the rent charged.",
};

export function NewSaleForm({
  products,
  parties,
  godowns,
  role,
  today,
}: {
  products: Product[];
  parties: SaleParty[];
  godowns: { id: string; name: string }[];
  role: Role;
  /** "YYYY-MM-DD", worked out on the server so it matches between server and browser. */
  today: string;
}) {
  const id = useId();
  const [partyId, setPartyId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [receivedDate, setReceivedDate] = useState("");
  const [source, setSource] = useState<Source>("godown");
  const [godownId, setGodownId] = useState(godowns[0]?.id ?? "");
  const [vehicle, setVehicle] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { key: 1, productId: products[0].id, qty: "", rate: String(products[0].listRate) },
  ]);
  const [nextKey, setNextKey] = useState(2);
  const [discountMode, setDiscountMode] = useState<DiscountMode>("amount");
  const [discountValue, setDiscountValue] = useState("");
  const [transportMode, setTransportMode] = useState<TransportMode>("FOR");
  const [transportCharge, setTransportCharge] = useState("");
  const [unloadingCharge, setUnloadingCharge] = useState("");
  const [otherCharge, setOtherCharge] = useState("");
  const [destination, setDestination] = useState("");
  const [memo, setMemo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [reason, setReason] = useState("");
  const toast = useToast();

  const productById = (productId: string) => products.find((p) => p.id === productId) ?? products[0];
  const party = parties.find((p) => p.id === partyId);

  const totals = computeTotals({
    lines: lines.map((l) => ({ qty: num(l.qty), rate: num(l.rate) })),
    discountMode,
    discountValue: num(discountValue),
    transportMode,
    transportCharge: num(transportCharge),
    unloadingCharge: num(unloadingCharge),
    otherCharge: num(otherCharge),
  });
  const credit = party ? checkCredit(party.creditLimit, party.outstanding, totals.total) : null;

  const isOwner = role === "owner";
  const discountOverLimit = totals.discountPercent > maxDiscountPercent[role];
  const rateChanged = lines.some((l) => num(l.rate) !== productById(l.productId).listRate);
  const needsApproval = Boolean(credit?.overLimit) || discountOverLimit;
  const needsReason = (isOwner && needsApproval) || rateChanged;
  const hasLines = lines.some((l) => num(l.qty) > 0 && num(l.rate) > 0);

  const missing = !party
    ? "Choose a party to continue."
    : !hasLines
      ? "Enter a quantity and rate for at least one item."
      : needsReason && !reason.trim()
        ? "Enter the reason before saving."
        : null;
  const actionLabel = needsApproval ? (isOwner ? "Save with override" : "Send for approval") : "Save sale";

  const quantities = lines.reduce(
    (acc, l) => {
      const product = productById(l.productId);
      const qty = num(l.qty);
      acc[product.category].qty += qty;
      acc[product.category].mt += toMT(qty, product.unit);
      return acc;
    },
    { cement: { qty: 0, mt: 0 }, steel: { qty: 0, mt: 0 } },
  );

  function updateLine(key: number, patch: Partial<Line>) {
    setLines((current) => current.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function addLine() {
    const product = products[0];
    setLines((current) => [...current, { key: nextKey, productId: product.id, qty: "", rate: String(product.listRate) }]);
    setNextKey((k) => k + 1);
  }

  function save() {
    if (missing) return;
    toast(
      needsApproval && !isOwner
        ? "Sample mode: the approval request was checked but not sent. Sending starts once Supabase is connected."
        : sampleSaveMessage("bill"),
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <form
        className="flex max-w-[640px] flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <section className="surface space-y-4 p-5">
          <Field label="Party" htmlFor={`${id}-party`}>
            <Select
              id={`${id}-party`}
              label="Party"
              placeholder="Choose a party"
              value={partyId}
              onChange={setPartyId}
              options={parties.map((p) => ({ value: p.id, label: p.name, hint: p.place }))}
            />
          </Field>
          {credit && <CreditPanel credit={credit} billTotal={totals.total} isOwner={isOwner} />}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bill date" htmlFor={`${id}-date`}>
              <input
                id={`${id}-date`}
                type="date"
                className={inputClass}
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </Field>
            <Field label="Truck received on" htmlFor={`${id}-received`} hint="Only if different">
              <input
                id={`${id}-received`}
                type="date"
                className={inputClass}
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="surface space-y-4 p-5">
          <SectionTitle>Load from</SectionTitle>
          <Segmented
            label="Load from"
            value={source}
            onChange={setSource}
            options={[
              { value: "godown", label: "Godown" },
              { value: "lorry", label: "Lorry" },
              { value: "van", label: "Van" },
            ]}
          />
          {source === "godown" ? (
            <Field label="Godown" htmlFor={`${id}-godown`}>
              <Select id={`${id}-godown`} label="Godown" value={godownId} onChange={setGodownId} options={godowns.map((g) => ({ value: g.id, label: g.name }))} />
            </Field>
          ) : (
            <Field label={source === "lorry" ? "Lorry number" : "Van number"} htmlFor={`${id}-vehicle`}>
              <input
                id={`${id}-vehicle`}
                className={inputClass}
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value.toUpperCase())}
                placeholder="AP 30 AB 1234"
              />
            </Field>
          )}
        </section>

        <section className="surface p-5">
          <SectionTitle>Items</SectionTitle>
          <ul className="divide-y divide-hairline">
            {lines.map((line, index) => {
              const product = productById(line.productId);
              const qty = num(line.qty);
              const rate = num(line.rate);
              return (
                <li key={line.key} className="space-y-3 py-4">
                  <div className="flex items-end gap-2">
                    <Field label={`Item ${index + 1}`} htmlFor={`${id}-product-${line.key}`} className="flex-1">
                      <Select
                        id={`${id}-product-${line.key}`}
                        label="Product"
                        value={line.productId}
                        onChange={(v) => {
                          const next = productById(v);
                          updateLine(line.key, { productId: next.id, rate: String(next.listRate) });
                        }}
                        options={products.map((p) => ({ value: p.id, label: p.name }))}
                      />
                    </Field>
                    {lines.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Remove item ${index + 1}`}
                        onClick={() => setLines((current) => current.filter((l) => l.key !== line.key))}
                        className="mb-1 grid size-10 shrink-0 place-items-center rounded-full text-ink-secondary hover:bg-hairline"
                      >
                        <X size={18} strokeWidth={2} aria-hidden />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Quantity"
                      htmlFor={`${id}-qty-${line.key}`}
                      hint={qty > 0 ? `${formatNumber(toMT(qty, product.unit), 3)} MT` : undefined}
                    >
                      <AffixInput
                        id={`${id}-qty-${line.key}`}
                        inputMode="decimal"
                        placeholder="0"
                        suffix={unitLabel[product.unit]}
                        value={line.qty}
                        onChange={(e) => updateLine(line.key, { qty: e.target.value })}
                      />
                    </Field>
                    <Field
                      label={`Rate per ${product.unit}`}
                      htmlFor={`${id}-rate-${line.key}`}
                      hint={rate !== product.listRate ? `List rate ${formatINR(product.listRate)}` : undefined}
                    >
                      <AffixInput
                        id={`${id}-rate-${line.key}`}
                        inputMode="decimal"
                        prefix="₹"
                        value={line.rate}
                        onChange={(e) => updateLine(line.key, { rate: e.target.value })}
                      />
                    </Field>
                  </div>
                  <div className="flex justify-between text-[15px]">
                    <span className="text-ink-secondary">Amount</span>
                    <span className="font-semibold tabular-nums text-ink">{formatINR(qty * rate)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          <Button variant="secondary" onClick={addLine} className="mt-1 w-full">
            <Plus size={18} strokeWidth={2} aria-hidden />
            Add item
          </Button>
        </section>

        <section className="surface space-y-4 p-5">
          <SectionTitle>Discount</SectionTitle>
          <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3">
            <Segmented
              label="Discount type"
              value={discountMode}
              onChange={setDiscountMode}
              options={[
                { value: "amount", label: "₹" },
                { value: "percent", label: "%" },
              ]}
            />
            <AffixInput
              aria-label="Discount"
              inputMode="decimal"
              placeholder="0"
              prefix={discountMode === "amount" ? "₹" : undefined}
              suffix={discountMode === "percent" ? "%" : undefined}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
            />
          </div>
          {totals.discount > 0 && (
            <p className={cn("text-[13px]", discountOverLimit ? "text-warning" : "text-ink-secondary")}>
              {formatINR(totals.discount)} off · {formatNumber(totals.discountPercent)}% of {formatINR(totals.subtotal)}
              {discountOverLimit && ` · above the ${maxDiscountPercent[role]}% limit for your role, needs owner approval`}
            </p>
          )}

          <SectionTitle className="pt-2">Transport</SectionTitle>
          <Segmented
            label="Transport mode"
            value={transportMode}
            onChange={setTransportMode}
            options={[
              { value: "FOR", label: "FOR" },
              { value: "EX", label: "EX" },
              { value: "RENT", label: "Rent" },
            ]}
          />
          <p className="text-[13px] text-ink-secondary">{transportHelp[transportMode]}</p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Transport" htmlFor={`${id}-transport`}>
              <AffixInput
                id={`${id}-transport`}
                inputMode="decimal"
                prefix="₹"
                placeholder="0"
                disabled={transportMode === "EX"}
                value={transportMode === "EX" ? "" : transportCharge}
                onChange={(e) => setTransportCharge(e.target.value)}
              />
            </Field>
            <Field label="Unloading" htmlFor={`${id}-unloading`}>
              <AffixInput
                id={`${id}-unloading`}
                inputMode="decimal"
                prefix="₹"
                placeholder="0"
                value={unloadingCharge}
                onChange={(e) => setUnloadingCharge(e.target.value)}
              />
            </Field>
            <Field label="Other" htmlFor={`${id}-other`}>
              <AffixInput
                id={`${id}-other`}
                inputMode="decimal"
                prefix="₹"
                placeholder="0"
                value={otherCharge}
                onChange={(e) => setOtherCharge(e.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="surface space-y-4 p-5">
          <Field label="Shipping destination" htmlFor={`${id}-destination`}>
            <input
              id={`${id}-destination`}
              className={inputClass}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Village or site"
            />
          </Field>
          <Field label="Paper memo number" htmlFor={`${id}-memo`} hint="Number from the paper bill book, if any">
            <input id={`${id}-memo`} className={inputClass} value={memo} onChange={(e) => setMemo(e.target.value)} />
          </Field>
          <Field label="Remarks" htmlFor={`${id}-remarks`}>
            <textarea
              id={`${id}-remarks`}
              rows={3}
              className={cn(inputClass, "h-auto py-3")}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </Field>
          {needsReason && (
            <Field
              label={
                rateChanged && needsApproval
                  ? "Reason for the override and rate change"
                  : rateChanged
                    ? "Reason for the rate change"
                    : "Reason for the override"
              }
              htmlFor={`${id}-reason`}
              hint="Saved with the bill in the audit history."
            >
              <input
                id={`${id}-reason`}
                className={inputClass}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
          )}
        </section>

        {missing && <p className="px-1 text-[13px] text-ink-secondary lg:hidden">{missing}</p>}
        {/* Room for the fixed total bar on phones and tablets. */}
        <div className="h-20 lg:hidden" aria-hidden />
      </form>

      <aside className="hidden lg:sticky lg:top-20 lg:block">
        <section className="surface p-6">
          <h2 className="text-[17px] font-semibold tracking-[-0.3px] text-ink">Bill summary</h2>
          <dl className="mt-4 space-y-2.5 text-[15px]">
            <SummaryRow label="Items" value={formatINR(totals.subtotal)} />
            {totals.discount > 0 && <SummaryRow label="Discount" value={`− ${formatINR(totals.discount)}`} />}
            {totals.charges > 0 && <SummaryRow label="Charges" value={formatINR(totals.charges)} />}
          </dl>
          <div className="mt-4 border-t border-hairline pt-4">
            <p className="text-[13px] text-ink-secondary">Total</p>
            <p className="text-[34px] font-semibold leading-[41px] tracking-[-0.4px] tabular-nums text-ink">
              {formatINR(totals.total)}
            </p>
            {(quantities.cement.qty > 0 || quantities.steel.qty > 0) && (
              <p className="mt-1 text-[13px] text-ink-secondary">
                {[
                  quantities.cement.qty > 0 &&
                    `${formatNumber(quantities.cement.qty)} bags (${formatNumber(quantities.cement.mt, 3)} MT)`,
                  quantities.steel.qty > 0 &&
                    `${formatNumber(quantities.steel.qty)} kg (${formatNumber(quantities.steel.mt, 3)} MT)`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
          {missing && <p className="mt-4 text-[13px] text-ink-secondary">{missing}</p>}
          <Button className="mt-5 w-full" disabled={Boolean(missing)} onClick={save}>
            {actionLabel}
          </Button>
        </section>
      </aside>

      <div className="frosted fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-20 border-t border-black/[0.08] md:bottom-0 md:left-[72px] lg:hidden">
        <div className="mx-auto flex max-w-[640px] items-center gap-3 px-4 py-3 md:px-8">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-ink-secondary">Total</p>
            <p className="truncate text-[20px] font-semibold tabular-nums tracking-[-0.3px] text-ink">
              {formatINR(totals.total)}
            </p>
          </div>
          <Button disabled={Boolean(missing)} onClick={save}>
            {actionLabel}
          </Button>
        </div>
      </div>

    </div>
  );
}

function SectionTitle({ className, children }: { className?: string; children: ReactNode }) {
  return <h2 className={cn("text-[17px] font-semibold tracking-[-0.3px] text-ink", className)}>{children}</h2>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-secondary">{label}</dt>
      <dd className="tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function CreditPanel({ credit, billTotal, isOwner }: { credit: CreditCheck; billTotal: number; isOwner: boolean }) {
  const share = (amount: number) => (credit.limit > 0 ? Math.min(100, (amount / credit.limit) * 100) : 100);
  const used = share(credit.outstanding);
  const bill = Math.min(100 - used, share(billTotal));

  return (
    <div className={cn("rounded-2xl p-4", credit.overLimit ? "bg-danger-soft" : "border border-hairline bg-card-subtle")}>
      <div className="flex justify-between gap-3 text-[13px] text-ink-secondary">
        <span>Limit {formatINR(credit.limit)}</span>
        <span>Outstanding {formatINR(credit.outstanding)}</span>
      </div>
      <div
        className="mt-2 flex h-2 overflow-hidden rounded-full bg-card"
        role="img"
        aria-label={`${formatINR(credit.afterSale)} of ${formatINR(credit.limit)} limit used after this bill`}
      >
        <div className={credit.overLimit ? "bg-danger/40" : "bg-accent/40"} style={{ width: `${used}%` }} />
        <div className={credit.overLimit ? "bg-danger" : "bg-accent"} style={{ width: `${bill}%` }} />
      </div>
      {credit.overLimit ? (
        <>
          <p className="mt-3 text-[15px] font-semibold text-danger">
            Over limit by {formatINR(credit.over)} with this bill
          </p>
          <p className="text-[13px] text-ink-secondary">
            {isOwner
              ? "You can save with an override; the reason is kept in the audit history."
              : "Needs owner approval before it is saved."}
          </p>
        </>
      ) : (
        <p className="mt-3 text-[13px] text-ink-secondary">
          Available {formatINR(credit.available)}
          {billTotal > 0 && ` · ${formatINR(credit.limit - credit.afterSale)} left after this bill`}
        </p>
      )}
    </div>
  );
}
