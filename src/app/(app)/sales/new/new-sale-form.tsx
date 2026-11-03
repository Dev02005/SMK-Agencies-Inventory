"use client";

import { Plus, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { ProductPicker } from "@/components/forms/product-picker";
import { DatePicker } from "@/components/ui/date-picker";
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
import type { Party, Product } from "@/lib/data/types";
import { useLorryBook } from "@/lib/lorry-book";
import { FirmPicker, type FirmChoice } from "@/components/forms/firm-picker";
import { NewCustomer } from "./new-customer";
import { partyOptions } from "@/lib/party-options";
import { useViewAs } from "@/lib/roles";

export type SaleParty = {
  id: string;
  name: string;
  place?: string;
  kind: Party["kind"];
  creditLimit: number | null;
  outstanding: number;
  /** Lets the party search find them by number. */
  mobile?: string;
};

type Line = { key: number; productId: string; qty: string; rate: string };
/** The company lorry a bill is sold from, as noted when it arrived. Invoice and tick boxes may be empty. */
export type LorryOnSale = {
  id: string;
  lorryNo: string;
  companyName: string;
  driverName?: string;
  invoiceNo?: string;
  invoicePaperKept?: boolean;
  unloadingCharges?: boolean;
};

/** A vehicle to pick for delivery: "Lorry AP 30 TB 1186", with its model, driver or owner as the hint. */
export type VehicleChoice = { id: string; label: string; hint?: string };

const num = (value: string) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

/** A new line's rate: the product's list rate, or empty when none is set yet (Settings › Products & rates). */
const startRate = (product: Product) => (product.listRate > 0 ? String(product.listRate) : "");

const transportHelp: Record<TransportMode, string> = {
  FOR: "Our own vehicle delivers; transport is charged.",
  EX: "The customer's own vehicle collects; no charges.",
  RENT: "A rented vehicle delivers; its rent is not added to the bill.",
};

export function NewSaleForm({
  firms,
  primaryFirmId,
  products,
  parties,
  godowns,
  ownVehicles,
  rentedVehicles,
  lorries,
  preselect,
  today,
}: {
  /** The owner's firms. A sale is billed from the primary firm unless it is changed for this one bill. */
  firms: FirmChoice[];
  primaryFirmId: string;
  products: Product[];
  parties: SaleParty[];
  /** The bill's bags come out of the godown, or the company lorry, picked under "Load from". */
  godowns: { id: string; name: string }[];
  /** Our own lorries and vans, for FOR deliveries. */
  ownVehicles: VehicleChoice[];
  /** Rented vehicles, for RENT deliveries. */
  rentedVehicles: VehicleChoice[];
  /** Company lorries selling now (the ones noted on this device are added here). */
  lorries: LorryOnSale[];
  /** A godown or lorry to start on (Sales › Lorry sales › Sell from this lorry). */
  preselect?: string;
  /** "YYYY-MM-DD", worked out on the server so it matches between server and browser. */
  today: string;
}) {
  const id = useId();
  const [role] = useViewAs();
  // Only the owner prices a bill. Everyone else sends the items, quantities and vehicle; the owner sets the
  // rates, discount and charges and confirms it (on the bill's page).
  const pricing = role === "owner";
  const [firmId, setFirmId] = useState(primaryFirmId);
  const [changingFirm, setChangingFirm] = useState(false);
  const firm = firms.find((f) => f.id === firmId) ?? firms[0];
  // Parties to choose from, plus any customer added here with New customer.
  const [partyList, setPartyList] = useState(parties);
  const [partyId, setPartyId] = useState("");
  // What was typed in the party search when New customer was picked; null while the New customer form is closed.
  const [newCustomer, setNewCustomer] = useState<string | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [lines, setLines] = useState<Line[]>([
    { key: 1, productId: products[0].id, qty: "", rate: startRate(products[0]) },
  ]);
  const [nextKey, setNextKey] = useState(2);
  const [discountMode, setDiscountMode] = useState<DiscountMode>("amount");
  const [discountValue, setDiscountValue] = useState("");
  // A godown id or a lorry id. Lorries noted on this device appear once the page is running in the browser.
  const [loadFrom, setLoadFrom] = useState(preselect ?? godowns[0]?.id ?? "");
  // Lorries are offered only to the owner (lorry sales are the owner's alone).
  const deviceLorries: LorryOnSale[] = useLorryBook()
    .filter((l) => pricing && !l.closed)
    .map((l) => ({
      id: l.id,
      lorryNo: l.lorryNo,
      companyName: l.companyName,
      driverName: l.driverName,
      invoiceNo: l.invoiceNo,
      invoicePaperKept: l.invoicePaperKept,
      unloadingCharges: l.unloadingCharges,
    }));
  const allLorries = [...lorries, ...deviceLorries];
  const lorry = allLorries.find((l) => l.id === loadFrom);
  const loadFromKnown = Boolean(lorry) || godowns.some((g) => g.id === loadFrom);
  const [transportMode, setTransportMode] = useState<TransportMode>("FOR");
  const [ownVehicleId, setOwnVehicleId] = useState("");
  const [rentedVehicleId, setRentedVehicleId] = useState("");
  const [customerVehicle, setCustomerVehicle] = useState("");
  const [transportCharge, setTransportCharge] = useState("");
  const [otherCharge, setOtherCharge] = useState("");
  const [destination, setDestination] = useState("");
  const [memo, setMemo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [reason, setReason] = useState("");
  const toast = useToast();

  const productById = (productId: string) => products.find((p) => p.id === productId) ?? products[0];
  const party = partyList.find((p) => p.id === partyId);

  // EX: the customer's own vehicle, so nothing is charged on top of the items. Only FOR (our vehicle) charges
  // transport; any mode but EX may add an optional "Other" charge. Rent and unloading are not put on bills.
  const charged = transportMode !== "EX";
  const totals = computeTotals({
    lines: lines.map((l) => ({ qty: num(l.qty), rate: num(l.rate) })),
    discountMode,
    discountValue: num(discountValue),
    transportMode,
    transportCharge: transportMode === "FOR" ? num(transportCharge) : 0,
    unloadingCharge: 0,
    otherCharge: charged ? num(otherCharge) : 0,
  });
  const credit = party && pricing ? checkCredit(party.creditLimit, party.outstanding, totals.total) : null;

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

  const isOwner = role === "owner";
  const discountOverLimit = totals.discountPercent > maxDiscountPercent[role];
  // Only against a set list rate: a product without one has nothing to differ from.
  const rateChanged = lines.some((l) => productById(l.productId).listRate > 0 && num(l.rate) !== productById(l.productId).listRate);
  const needsApproval = pricing && (Boolean(credit?.overLimit) || discountOverLimit);
  const needsReason = pricing && ((isOwner && needsApproval) || rateChanged);
  const hasLines = lines.some((l) => num(l.qty) > 0 && (!pricing || num(l.rate) > 0));

  const missing = !party
    ? "Choose a party to continue."
    : !loadFromKnown
      ? "Choose the godown or lorry the bags are loaded from."
      : !hasLines
      ? pricing
        ? "Enter a quantity and rate for at least one item."
        : "Enter the quantity for at least one item."
      : needsReason && !reason.trim()
        ? "Enter the reason before saving."
        : null;
  const actionLabel = !pricing ? "Send to owner" : needsApproval ? (isOwner ? "Save with override" : "Send for approval") : "Save sale";
  const quantityLine = [
    quantities.cement.qty > 0 && `${formatNumber(quantities.cement.qty)} bags (${formatNumber(quantities.cement.mt, 3)} MT)`,
    quantities.steel.qty > 0 && `${formatNumber(quantities.steel.qty)} kg (${formatNumber(quantities.steel.mt, 3)} MT)`,
  ]
    .filter(Boolean)
    .join(" · ");

  function chooseParty(next: string, picked = partyList.find((p) => p.id === next)) {
    // The destination follows the party's town unless it was typed by hand.
    if (!destination || destination === (party?.place ?? "")) setDestination(picked?.place ?? "");
    setPartyId(next);
  }

  function updateLine(key: number, patch: Partial<Line>) {
    setLines((current) => current.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function addLine() {
    const product = products[0];
    setLines((current) => [...current, { key: nextKey, productId: product.id, qty: "", rate: startRate(product) }]);
    setNextKey((k) => k + 1);
  }

  function save() {
    if (missing) return;
    if (!pricing) {
      toast("Sample mode: the request to the owner was checked but not sent. Sending starts once Supabase is connected.");
      return;
    }
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
        <p className="px-1 text-[13px] text-ink-secondary">
          Billed from <span className="font-medium text-ink">{firm.name}</span>
          {firm.gstin && <span className="tabular-nums"> · GSTIN {firm.gstin}</span>}
          {firm.id !== primaryFirmId && <span className="font-medium text-warning"> · not the primary firm</span>}
          {firms.length > 1 && (
            <>
              {" · "}
              <button type="button" onClick={() => setChangingFirm((c) => !c)} aria-expanded={changingFirm} className="font-medium text-link hover:underline">
                {changingFirm ? "Done" : "Change firm"}
              </button>
            </>
          )}
        </p>
        {changingFirm && (
          <FirmPicker
            label="Bill this sale from"
            firms={firms}
            value={firmId}
            onChange={(next) => {
              setFirmId(next);
              setChangingFirm(false);
            }}
          />
        )}

        <section className="surface space-y-4 p-5">
          <Field label="Party" htmlFor={`${id}-party`} hint="Search by name or mobile number">
            <Select
              id={`${id}-party`}
              label="Party"
              placeholder="Choose a party"
              value={partyId}
              onChange={chooseParty}
              options={partyOptions(partyList)}
              searchable
              action={{ label: "New customer", onPick: setNewCustomer }}
            />
          </Field>
          {newCustomer !== null && (
            <NewCustomer
              parties={partyList}
              typed={newCustomer}
              onCancel={() => setNewCustomer(null)}
              onDone={(picked, added) => {
                if (added) setPartyList((list) => [...list, picked]);
                chooseParty(picked.id, picked);
                setNewCustomer(null);
                toast(added ? `${picked.name} added as a customer` : `Billing ${picked.name}`);
              }}
            />
          )}
          {credit && <CreditPanel credit={credit} billTotal={totals.total} isOwner={isOwner} />}
          <Field label="Bill date" htmlFor={`${id}-date`}>
            <DatePicker id={`${id}-date`} label="Bill date" value={invoiceDate} onChange={setInvoiceDate} />
          </Field>
        </section>

        <section className="surface p-5">
          <SectionTitle>Items</SectionTitle>
          <Field label="Load from" htmlFor={`${id}-from`} className="mt-3">
            <Select
              id={`${id}-from`}
              label="Load from"
              placeholder="Choose a godown or lorry"
              value={loadFrom}
              onChange={setLoadFrom}
              options={[
                ...godowns.map((g) => ({ value: g.id, label: g.name })),
                ...allLorries.map((l) => ({
                  value: l.id,
                  label: l.lorryNo,
                  hint: [l.companyName, l.driverName && `driver ${l.driverName}`].filter(Boolean).join(" · "),
                  group: "Lorries selling now",
                })),
              ]}
            />
          </Field>
          {lorry && (
            <div className="mt-3 rounded-xl bg-accent-soft px-3.5 py-2.5 text-[14px] text-ink">
              <p>
                Selling from lorry <span className="font-semibold">{lorry.lorryNo}</span> · {lorry.companyName}
                {lorry.driverName && ` · driver ${lorry.driverName}`}. These bags come off the lorry, not out of a godown.
              </p>
              <p className="mt-1 text-[13px] text-ink-secondary">
                {[
                  lorry.invoiceNo ? `Invoice ${lorry.invoiceNo}` : "No invoice number yet",
                  lorry.invoicePaperKept ? "invoice paper with us" : "invoice paper not with us",
                  lorry.unloadingCharges ? "unloading charges" : "no unloading charges",
                ].join(" · ")}
              </p>
            </div>
          )}
          <ul className="divide-y divide-hairline">
            {lines.map((line, index) => {
              const product = productById(line.productId);
              const qty = num(line.qty);
              const rate = num(line.rate);
              return (
                <li key={line.key} className="space-y-3 py-4">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <ProductPicker
                        label={`Item ${index + 1}`}
                        products={products}
                        value={line.productId}
                        onChange={(v) => {
                          const next = productById(v);
                          updateLine(line.key, { productId: next.id, rate: startRate(next) });
                        }}
                      />
                    </div>
                    {lines.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Remove item ${index + 1}`}
                        onClick={() => setLines((current) => current.filter((l) => l.key !== line.key))}
                        className="grid size-10 shrink-0 place-items-center rounded-full text-ink-secondary hover:bg-hairline"
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
                    {pricing && (
                      <Field
                        label={`Rate per ${product.unit}`}
                        htmlFor={`${id}-rate-${line.key}`}
                        hint={product.listRate > 0 && rate !== product.listRate ? `List rate ${formatINR(product.listRate)}` : undefined}
                      >
                        <AffixInput
                          id={`${id}-rate-${line.key}`}
                          inputMode="decimal"
                          prefix="₹"
                          value={line.rate}
                          onChange={(e) => updateLine(line.key, { rate: e.target.value })}
                        />
                      </Field>
                    )}
                  </div>
                  {pricing && (
                    <div className="flex justify-between text-[15px]">
                      <span className="text-ink-secondary">Amount</span>
                      <span className="font-semibold tabular-nums text-ink">{formatINR(qty * rate)}</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <IconButton label="Add item" onClick={addLine} className="mt-1">
            <Plus size={20} strokeWidth={2} aria-hidden />
          </IconButton>
        </section>

        <section className="surface space-y-4 p-5">
          {pricing && (
            <>
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
            </>
          )}
          <SectionTitle className={pricing ? "pt-2" : undefined}>Transport</SectionTitle>
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
          <div className="grid gap-3 sm:grid-cols-2">
            {transportMode === "EX" ? (
              <Field label="Customer's vehicle number" htmlFor={`${id}-vehicle`}>
                <input
                  id={`${id}-vehicle`}
                  className={inputClass}
                  value={customerVehicle}
                  onChange={(e) => setCustomerVehicle(e.target.value.toUpperCase())}
                  placeholder="AP 30 AB 1234"
                  autoCapitalize="characters"
                />
              </Field>
            ) : (
              <Field
                label={transportMode === "FOR" ? "Our vehicle" : "Rented vehicle"}
                htmlFor={`${id}-vehicle`}
                hint={(transportMode === "FOR" ? ownVehicles : rentedVehicles).length === 0 ? "Add vehicles under Vehicles" : undefined}
              >
                <Select
                  id={`${id}-vehicle`}
                  label={transportMode === "FOR" ? "Our vehicle" : "Rented vehicle"}
                  placeholder="Choose a vehicle"
                  value={transportMode === "FOR" ? ownVehicleId : rentedVehicleId}
                  onChange={transportMode === "FOR" ? setOwnVehicleId : setRentedVehicleId}
                  options={(transportMode === "FOR" ? ownVehicles : rentedVehicles).map((v) => ({ value: v.id, label: v.label, hint: v.hint }))}
                />
              </Field>
            )}
            <Field label="Destination" htmlFor={`${id}-destination`}>
              <input
                id={`${id}-destination`}
                className={inputClass}
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Village or site"
              />
            </Field>
          </div>
          {charged && pricing && (
            <div className="grid grid-cols-2 gap-3">
              {transportMode === "FOR" && (
                <Field label="Transport" htmlFor={`${id}-transport`}>
                  <AffixInput
                    id={`${id}-transport`}
                    inputMode="decimal"
                    prefix="₹"
                    placeholder="0"
                    value={transportCharge}
                    onChange={(e) => setTransportCharge(e.target.value)}
                  />
                </Field>
              )}
              <Field label="Other" htmlFor={`${id}-other`} hint="Optional">
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
          )}
        </section>

        <section className="surface space-y-4 p-5">
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
          <h2 className="text-[17px] font-semibold tracking-[-0.3px] text-ink">{pricing ? "Bill summary" : "Request summary"}</h2>
          <p className="mt-1 text-[13px] text-ink-secondary">From {firm.name}</p>
          {!pricing && (
            <div className="mt-4">
              <p className="text-[15px] text-ink">{quantityLine || "No items yet"}</p>
              <p className="mt-2 text-[13px] text-ink-secondary">The owner sets the rates, discount and charges and confirms the sale.</p>
            </div>
          )}
          {pricing && (
            <>
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
                {quantityLine && <p className="mt-1 text-[13px] text-ink-secondary">{quantityLine}</p>}
              </div>
            </>
          )}
          {missing && <p className="mt-4 text-[13px] text-ink-secondary">{missing}</p>}
          <Button className="mt-5 w-full" disabled={Boolean(missing)} onClick={save}>
            {actionLabel}
          </Button>
        </section>
      </aside>

      <div className="frosted fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-20 border-t border-black/[0.08] md:bottom-0 md:left-[72px] lg:hidden">
        <div className="mx-auto flex max-w-[640px] items-center gap-3 px-4 py-3 md:px-8">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-ink-secondary">{pricing ? "Total" : "Items"}</p>
            <p className="truncate text-[20px] font-semibold tabular-nums tracking-[-0.3px] text-ink">
              {pricing ? formatINR(totals.total) : quantityLine || "None yet"}
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
