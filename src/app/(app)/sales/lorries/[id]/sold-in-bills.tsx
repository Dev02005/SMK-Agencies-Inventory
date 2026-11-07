"use client";

import Link from "next/link";
import { ExternalLink, MapPin, Phone, Plus, ReceiptText, ShieldAlert, X } from "lucide-react";
import { useId, useState } from "react";
import { LorryProgress } from "@/components/lorries/lorry-progress";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/data/types";
import { formatINR } from "@/lib/format";
import { checkCredit, unitLabel } from "@/lib/sales";
import { partyOptions } from "@/lib/party-options";
import type { SaleParty } from "@/app/(app)/sales/new/new-sale-form";
import { NewCustomer } from "@/app/(app)/sales/new/new-customer";

/**
 * One sale bill from the lorry, as typed: its date, who bought, how much of each item and the bill's amount.
 * `billNo` is its saved number; a new bill has none until it is saved, when it takes the next in the series.
 */
export type BillRow = {
  key: number;
  date: string;
  billNo: string;
  partyId?: string;
  soldTo: string;
  cashName?: string;
  cashMobile?: string;
  place?: string;
  customMode?: boolean;
  qty: Record<string, string>;
  amount: string;
};

export const num = (v: string | undefined) => (v && Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);

export const emptyBill = (key: number, date: string): BillRow => ({
  key,
  date,
  billNo: "",
  partyId: "",
  soldTo: "",
  cashName: "",
  cashMobile: "",
  place: "",
  qty: {},
  amount: "",
});

/** Whether anything has been typed on the bill (a saved bill always counts). */
export const billUsed = (b: BillRow) =>
  Boolean(
    b.billNo ||
      b.partyId ||
      b.soldTo.trim() ||
      b.cashName?.trim() ||
      num(b.amount) > 0 ||
      Object.values(b.qty).some((q) => num(q) > 0),
  );

/** The number each bill has, or will get when saved: new bills take the next numbers in the series, in order. */
export function billNumbers(bills: BillRow[], seriesNext: number) {
  let next = seriesNext;
  return new Map(bills.map((b) => [b.key, b.billNo || String(next++)]));
}

/**
 * What a company lorry sold, bill by bill: items on one bill for ₹X, on another for ₹Y, and what is still on
 * the lorry. With full customer directory details, credit limits and balances like in godown sales.
 */
export function SoldInBills({
  loaded,
  products,
  bills,
  onChange,
  today,
  seriesNext,
  parties = [],
}: {
  /** What came on the lorry. */
  loaded: { productId: string; qty: number }[];
  products: Product[];
  bills: BillRow[];
  onChange: (bills: BillRow[]) => void;
  today: string;
  /** The next number in the bill series, for a new bill. */
  seriesNext: number;
  /** Customer directory */
  parties?: SaleParty[];
}) {
  const id = useId();
  const toast = useToast();
  const [partyList, setPartyList] = useState<SaleParty[]>(parties);
  const [newCustomerFor, setNewCustomerFor] = useState<number | null>(null);

  const product = (pid: string) => products.find((p) => p.id === pid);
  const unitOf = (pid: string) => unitLabel[product(pid)?.unit ?? "bag"];
  const soldOf = (pid: string) => bills.reduce((s, b) => s + num(b.qty[pid]), 0);
  const update = (key: number, patch: Partial<BillRow>) =>
    onChange(bills.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  const add = () => onChange([...bills, emptyBill(Math.max(0, ...bills.map((b) => b.key)) + 1, today)]);
  const numbers = billNumbers(bills, seriesNext);
  const billsTotal = bills.reduce((s, b) => s + num(b.amount), 0);

  function handleChooseParty(billKey: number, pickedId: string, partyObj?: SaleParty) {
    const chosen = partyObj ?? partyList.find((p) => p.id === pickedId);
    if (!chosen) {
      update(billKey, { partyId: "", soldTo: "" });
      return;
    }

    if (chosen.kind === "cash") {
      update(billKey, {
        partyId: chosen.id,
        soldTo: "Cash customer",
        place: chosen.place ?? "",
      });
    } else {
      update(billKey, {
        partyId: chosen.id,
        soldTo: chosen.name,
        place: chosen.place ?? "",
        cashMobile: chosen.mobile ?? "",
      });
    }
  }

  return (
    <section className="surface p-5">
      <h2 className="text-[17px] font-semibold tracking-[-0.3px] text-ink">Sale bills from this lorry</h2>
      <p className="mt-0.5 text-[13px] text-ink-secondary">
        One row for each bill: choose customer, bags and amount. Each bill tracks customer credit, outstanding and bill series.
      </p>

      {/* What is left on the lorry, as the bills below are typed. */}
      <div className="mt-4 rounded-2xl bg-card-subtle p-4">
        <LorryProgress loaded={loaded} sold={soldOf} products={products} bills={bills.map(b => ({
          date: b.date,
          billNo: numbers.get(b.key) ?? b.billNo,
          partyId: b.partyId,
          soldTo: b.soldTo,
          cashName: b.cashName,
          cashMobile: b.cashMobile,
          place: b.place,
          qty: loaded.reduce((s, l) => s + num(b.qty[l.productId]), 0),
          amount: num(b.amount)
        }))} parties={partyList} />
      </div>

      <ol className="mt-4 space-y-4">
        {bills.map((b) => {
          const qtyHere = loaded.reduce((s, l) => s + num(b.qty[l.productId]), 0);
          const number = numbers.get(b.key) ?? "";
          const noAmount = qtyHere > 0 && !(num(b.amount) > 0);
          const noQty = num(b.amount) > 0 && qtyHere === 0;

          // Find matching party
          const party = partyList.find(
            (p) =>
              p.id === b.partyId ||
              (Boolean(b.soldTo) && p.name.trim().toLowerCase() === b.soldTo.trim().toLowerCase()),
          );
          const billAmount = num(b.amount);
          const credit =
            party && party.kind !== "cash" && party.creditLimit !== null
              ? checkCredit(party.creditLimit, party.outstanding, billAmount)
              : null;

          return (
            <li key={b.key} className="rounded-2xl border border-hairline p-4 space-y-3.5 bg-card">
              <div className="flex items-center justify-between gap-2 border-b border-hairline/60 pb-2.5">
                <p className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
                  <ReceiptText size={16} strokeWidth={1.9} className="text-accent" aria-hidden />
                  Bill #{number}
                  {!b.billNo && <span className="text-[12px] font-normal text-ink-secondary">· new, numbered on save</span>}
                </p>
                {bills.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove bill ${number}`}
                    onClick={() => onChange(bills.filter((x) => x.key !== b.key))}
                    className="grid size-9 shrink-0 place-items-center rounded-full text-ink-secondary hover:bg-hairline cursor-pointer"
                  >
                    <X size={18} strokeWidth={2} aria-hidden />
                  </button>
                )}
              </div>

              {/* Bill Date & Series No */}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Bill date" htmlFor={`${id}-${b.key}-date`}>
                  <DatePicker id={`${id}-${b.key}-date`} label="Bill date" value={b.date} onChange={(date) => update(b.key, { date })} />
                </Field>
                <Field label="Bill no." htmlFor={`${id}-${b.key}-no`} hint={b.billNo ? "Saved bill number" : "Next in shared series"}>
                  <output id={`${id}-${b.key}-no`} className={cn(inputClass, "flex items-center bg-card-subtle font-semibold tabular-nums text-ink")}>
                    #{number}
                  </output>
                </Field>
              </div>

              {/* Customer Selector / Data Section */}
              <div className="space-y-2">
                {b.customMode ? (
                  <Field label="Customer or spot destination" htmlFor={`${id}-${b.key}-to`} hint="Free-text custom name, destination or spot sale">
                    <input
                      id={`${id}-${b.key}-to`}
                      className={inputClass}
                      maxLength={60}
                      placeholder="e.g. Spot sale - Polaki / Dealer"
                      value={b.soldTo}
                      onChange={(e) => update(b.key, { soldTo: e.target.value })}
                    />
                  </Field>
                ) : (
                  <Field label="Customer / Party" htmlFor={`${id}-${b.key}-party`} hint="Search by customer name or 10-digit mobile number">
                    <Select
                      id={`${id}-${b.key}-party`}
                      label="Customer"
                      placeholder="Choose a customer"
                      value={party?.id ?? b.partyId ?? ""}
                      onChange={(val) => handleChooseParty(b.key, val)}
                      options={partyOptions(partyList)}
                      searchable
                      action={{
                        label: "New customer",
                        onPick: () => setNewCustomerFor(b.key),
                      }}
                    />
                  </Field>
                )}

                {/* Switch between directory and custom free-text */}
                <div className="flex justify-between items-center text-[12px] px-0.5">
                  <span className="text-ink-tertiary">
                    {b.customMode ? "Custom text mode enabled" : "Select from customer directory like godown sales"}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      update(b.key, {
                        customMode: !b.customMode,
                        ...(b.customMode ? {} : { partyId: undefined }),
                      })
                    }
                    className="font-medium text-link hover:underline cursor-pointer"
                  >
                    {b.customMode ? "← Pick from customer directory" : "Type custom spot name instead →"}
                  </button>
                </div>

                {/* Inline New Customer Modal Form */}
                {newCustomerFor === b.key && (
                  <div className="mt-3">
                    <NewCustomer
                      parties={partyList}
                      typed=""
                      onDone={(picked, added) => {
                        if (added) setPartyList((list) => [...list, picked]);
                        handleChooseParty(b.key, picked.id, picked);
                        setNewCustomerFor(null);
                        toast(added ? `${picked.name} added as customer` : `Selected ${picked.name}`);
                      }}
                      onCancel={() => setNewCustomerFor(null)}
                    />
                  </div>
                )}

                {/* Cash Customer Name & Mobile */}
                {party?.kind === "cash" && !b.customMode && (
                  <div className="grid gap-3 rounded-2xl bg-card-subtle p-3.5 sm:grid-cols-2">
                    <Field label="Walk-in customer name" htmlFor={`${id}-${b.key}-cash-name`}>
                      <input
                        id={`${id}-${b.key}-cash-name`}
                        className={inputClass}
                        placeholder="e.g. K. Satyam"
                        maxLength={60}
                        autoCapitalize="words"
                        value={b.cashName ?? ""}
                        onChange={(e) => update(b.key, { cashName: e.target.value })}
                      />
                    </Field>
                    <Field label="Phone number" htmlFor={`${id}-${b.key}-cash-mobile`}>
                      <AffixInput
                        id={`${id}-${b.key}-cash-mobile`}
                        prefix="+91"
                        inputMode="numeric"
                        placeholder="10-digit mobile"
                        value={b.cashMobile ?? ""}
                        onChange={(e) =>
                          update(b.key, { cashMobile: e.target.value.replace(/\D/g, "").slice(0, 10) })
                        }
                      />
                    </Field>
                  </div>
                )}

                {/* Customer Data Card (like Godown Sales) */}
                {party && party.kind !== "cash" && !b.customMode && (
                  <div className="rounded-2xl border border-hairline bg-card-subtle p-3.5 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink text-[14.5px]">{party.name}</span>
                        <Chip tone={party.kind === "sub_dealer" ? "accent" : "neutral"} className="text-[11px] h-5 px-2">
                          {party.kind === "sub_dealer" ? "Sub-dealer" : "Customer"}
                        </Chip>
                      </div>
                      <Link
                        href={`/parties/${party.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-link hover:underline"
                      >
                        Customer ledger <ExternalLink size={12} />
                      </Link>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-secondary">
                      {party.place && (
                        <span className="flex items-center gap-1">
                          <MapPin size={13} className="text-ink-tertiary" /> {party.place}
                        </span>
                      )}
                      {party.mobile && (
                        <a href={`tel:+91${party.mobile}`} className="flex items-center gap-1 hover:text-ink hover:underline">
                          <Phone size={13} className="text-ink-tertiary" /> +91 {party.mobile}
                        </a>
                      )}
                      <span className="font-medium text-ink">
                        Current balance:{" "}
                        <span className={cn(party.outstanding > 0 ? "text-warning font-semibold" : "text-good")}>
                          {formatINR(party.outstanding)}
                        </span>
                      </span>
                    </div>

                    {/* Credit Status & Limit Utilization */}
                    {credit && (
                      <div
                        className={cn(
                          "rounded-xl p-3 text-[12px] space-y-1.5",
                          credit.overLimit ? "bg-danger-soft text-danger" : "bg-card border border-hairline/80 text-ink-secondary",
                        )}
                      >
                        <div className="flex justify-between items-center font-medium">
                          <span>Credit limit: {formatINR(credit.limit)}</span>
                          <span>After this bill: {formatINR(credit.afterSale)}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-hairline overflow-hidden">
                          <div
                            className={cn("h-full transition-all", credit.overLimit ? "bg-danger" : "bg-accent")}
                            style={{
                              width: `${Math.min(100, credit.limit > 0 ? (credit.afterSale / credit.limit) * 100 : 100)}%`,
                            }}
                          />
                        </div>
                        {credit.overLimit ? (
                          <p className="font-semibold text-danger flex items-center gap-1.5 pt-0.5">
                            <ShieldAlert size={14} className="shrink-0" />
                            Over credit limit by {formatINR(credit.over)} with this bill
                          </p>
                        ) : (
                          <p className="text-ink-secondary pt-0.5">
                            Available credit after this bill:{" "}
                            <span className="font-semibold text-ink">
                              {formatINR(Math.max(0, credit.limit - credit.afterSale))}
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Items & Quantity Section */}
              <div className="grid gap-3 sm:grid-cols-2 pt-1 border-t border-hairline/60">
                {loaded.map((l) => (
                  <Field
                    key={l.productId}
                    label={loaded.length > 1 ? (product(l.productId)?.name ?? "Item") : "Quantity on this bill"}
                    htmlFor={`${id}-${b.key}-${l.productId}`}
                    error={noQty && l === loaded[0] ? "Enter how much is on this bill." : undefined}
                  >
                    <AffixInput
                      id={`${id}-${b.key}-${l.productId}`}
                      inputMode="decimal"
                      placeholder="0"
                      suffix={unitOf(l.productId)}
                      value={b.qty[l.productId] ?? ""}
                      onChange={(e) => update(b.key, { qty: { ...b.qty, [l.productId]: e.target.value } })}
                    />
                  </Field>
                ))}
                <Field
                  label="Bill amount"
                  htmlFor={`${id}-${b.key}-amount`}
                  error={noAmount ? "Enter the bill amount." : undefined}
                  hint={
                    !noAmount && loaded.length === 1 && qtyHere > 0 && num(b.amount) > 0
                      ? `${formatINR(num(b.amount) / qtyHere)} a ${product(loaded[0].productId)?.unit ?? "bag"}`
                      : undefined
                  }
                >
                  <AffixInput
                    id={`${id}-${b.key}-amount`}
                    prefix="₹"
                    inputMode="decimal"
                    placeholder="0"
                    value={b.amount}
                    onChange={(e) => update(b.key, { amount: e.target.value })}
                    aria-invalid={noAmount || undefined}
                  />
                </Field>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" onClick={add} className="gap-1.5">
          <Plus size={18} strokeWidth={2} aria-hidden />
          Add bill
        </Button>
        <p className="text-[15px] text-ink-secondary">
          {bills.filter((b) => num(b.amount) > 0).length} {bills.filter((b) => num(b.amount) > 0).length === 1 ? "bill" : "bills"} ·{" "}
          <span className="font-semibold tabular-nums text-ink">{formatINR(billsTotal)}</span>
        </p>
      </div>
    </section>
  );
}
