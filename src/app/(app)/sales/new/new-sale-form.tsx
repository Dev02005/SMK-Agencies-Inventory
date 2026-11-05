"use client";

import { Plus, X } from "lucide-react";
import { useId, useState, useEffect, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProductPicker } from "@/components/forms/product-picker";
import { DatePicker } from "@/components/ui/date-picker";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
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
import type { Godown, Party, Product, SaleStatus } from "@/lib/data/types";
import { FirmPicker, type FirmChoice } from "@/components/forms/firm-picker";
import { filledCharges, OtherCharges, unnamedCharge, type OtherCharge } from "@/components/forms/other-charges";
import { DestinationField } from "./destination-field";
import { NewCustomer } from "./new-customer";
import { partyOptions } from "@/lib/party-options";
import { useViewAs } from "@/lib/roles";
import { createSaleAction } from "../actions";

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

/** A vehicle to pick for delivery: "Lorry AP 30 TB 1186", with its model, driver or owner as the hint. */
export type VehicleChoice = {
  id: string;
  label: string;
  hint?: string;
  /** Who usually drives it (our vehicles). */
  driverId?: string;
  /** A rented vehicle's own driver, filled in when it is chosen. */
  driver?: { name: string; mobile?: string };
};

const num = (value: string) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

const transportHelp: Record<TransportMode, string> = {
  FOR: "Our own vehicle delivers; transport is charged.",
  EX: "The customer's own vehicle collects; no charges.",
  RENT: "A rented vehicle delivers; its rent is not added to the bill.",
};

export function NewSaleForm({
  firms,
  primaryFirmId,
  products: allProducts,
  stock,
  parties,
  godowns,
  ownVehicles,
  rentedVehicles,
  nextBillNo,
  destinations,
  ownDrivers,
  today,
}: {
  /** The owner's firms. A sale is billed from the primary firm unless it is changed for this one bill. */
  firms: FirmChoice[];
  primaryFirmId: string;
  products: Product[];
  /** What is in stock at each godown (more than zero); a bill offers only what its godown has. */
  stock: { godownId: string; productId: string; qty: number }[];
  parties: SaleParty[];
  /** The godown the bill's bags come out of. Company lorries are sold as a whole under Sales › Lorry sales, not billed here. */
  godowns: Godown[];
  /** Our own lorries and vans, for FOR deliveries. */
  ownVehicles: VehicleChoice[];
  /** Rented vehicles, for RENT deliveries. */
  rentedVehicles: VehicleChoice[];
  /** The next number in the bill series, for the owner to keep or change. */
  nextBillNo: number;
  /** Villages and towns we deliver to, for Destination. */
  destinations: string[];
  /** Our own drivers, for FOR deliveries. */
  ownDrivers: { id: string; name: string }[];
  /** "YYYY-MM-DD", worked out on the server so it matches between server and browser. */
  today: string;
}) {
  const id = useId();
  const [role] = useViewAs();
  // Only the owner prices a bill and gives it a bill no. Everyone else saves the items, quantities and vehicle with
  // no prices; the owner adds the bill no., rates, discount and charges and approves it (on the sale's page).
  // Products have no fixed rates, so every rate is typed in.
  const pricing = role === "owner";
  const [firmId, setFirmId] = useState(primaryFirmId);
  const [changingFirm, setChangingFirm] = useState(false);
  const firm = firms.find((f) => f.id === firmId) ?? firms[0];
  // Parties to choose from, plus any customer added here with New customer.
  const [partyList, setPartyList] = useState(parties);
  const [partyId, setPartyId] = useState("");
  // What was typed in the party search when New customer was picked; null while the New customer form is closed.
  const [newCustomer, setNewCustomer] = useState<string | null>(null);
  // The party chosen before New customer was opened, put back if it is cancelled.
  const [beforeNew, setBeforeNew] = useState("");
  // What is typed in the New customer form, kept if the bill switches to Cash customer instead.
  const [draft, setDraft] = useState({ name: "", mobile: "" });
  const [invoiceDate, setInvoiceDate] = useState(today);
  // The next number in the one series godown and lorry bills share; not typed, so it always follows on.
  const billNo = String(nextBillNo);
  // What the chosen godown has: only its brands and types can be billed from it, never more than it holds.
  const stockAt = (godownId: string, productId: string) => stock.find((s) => s.godownId === godownId && s.productId === productId)?.qty ?? 0;
  const stockedAt = (godownId: string) => allProducts.filter((p) => stockAt(godownId, p.id) > 0);
  const [loadFrom, setLoadFrom] = useState(godowns[0]?.id ?? "");
  const loadFromKnown = godowns.some((g) => g.id === loadFrom);
  const currentGodown = godowns.find((g) => g.id === loadFrom);

  // Products linked or permitted for this specific godown
  const godownAllowedProducts = useMemo(() => {
    if (!currentGodown) return allProducts;
    if (currentGodown.linkAllProducts) return allProducts;
    if (currentGodown.productIds && currentGodown.productIds.length > 0) {
      const allowedSet = new Set(currentGodown.productIds);
      const matched = allProducts.filter((p) => allowedSet.has(p.id));
      if (matched.length > 0) return matched;
    }
    if (currentGodown.own) return allProducts;
    // Fallback inference: company godown with brand matching godown name
    const nameLower = currentGodown.name.toLowerCase();
    const byBrand = allProducts.filter((p) => nameLower.includes(p.brand.toLowerCase()));
    return byBrand.length > 0 ? byBrand : allProducts;
  }, [currentGodown, allProducts]);

  const products = stockedAt(loadFrom).filter((p) => godownAllowedProducts.some((ap) => ap.id === p.id));
  const godownEmpty = loadFromKnown && godownAllowedProducts.length === 0;
  const initialProduct = godownAllowedProducts[0] ?? allProducts[0];
  const [lines, setLines] = useState<Line[]>(() =>
    initialProduct ? [{ key: 1, productId: initialProduct.id, qty: "", rate: "" }] : []
  );

  // When godown changes, update any line whose product is not linked to this godown
  useEffect(() => {
    if (!godownAllowedProducts.length) return;
    const allowed = new Set(godownAllowedProducts.map((p) => p.id));
    setLines((curr) => {
      let changed = false;
      const next = curr.map((l) => {
        if (!l.productId || !allowed.has(l.productId)) {
          changed = true;
          return { ...l, productId: godownAllowedProducts[0].id, rate: "" };
        }
        return l;
      });
      return changed ? next : curr;
    });
  }, [godownAllowedProducts]);

  const [nextKey, setNextKey] = useState(2);
  const [discountMode, setDiscountMode] = useState<DiscountMode>("amount");
  const [discountValue, setDiscountValue] = useState("");
  const [transportMode, setTransportMode] = useState<TransportMode>("FOR");
  const [ownVehicleId, setOwnVehicleId] = useState("");
  const [rentedVehicleId, setRentedVehicleId] = useState("");
  // FOR: one of our drivers (the vehicle's usual driver to start with). RENT: the rented vehicle's own driver, which
  // comes with the vehicle and isn't chosen separately.
  const [ownDriverId, setOwnDriverId] = useState("");
  const rentDriver = rentedVehicles.find((v) => v.id === rentedVehicleId)?.driver;
  const [customerVehicle, setCustomerVehicle] = useState("");
  // The vehicle's other costs, each with a name ("Toll", "Hamali"…): kept with the sale, never added to the bill.
  const [vehicleCosts, setVehicleCosts] = useState<OtherCharge[]>([]);
  // RENT: what the rented vehicle's driver is paid per bag; not on the bill either.
  const [freightPerBag, setFreightPerBag] = useState("");
  const [destination, setDestination] = useState("");
  // A cash (walk-in) customer has no saved party: their name and phone number are taken on the bill.
  const [cashName, setCashName] = useState("");
  const [cashMobile, setCashMobile] = useState("");
  const [remarks, setRemarks] = useState("");
  const [reason, setReason] = useState("");
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const productById = (productId: string) => allProducts.find((p) => p.id === productId) ?? godownAllowedProducts[0] ?? allProducts[0];
  const overStock = lines.find((l) => {
    const pid = l.productId || (godownAllowedProducts[0] ?? allProducts[0])?.id;
    return pid && num(l.qty) > stockAt(loadFrom, pid);
  });
  const party = partyList.find((p) => p.id === partyId);

  // EX: the customer's own vehicle, so nothing is charged on top of the items. Only FOR (our vehicle) charges
  // transport. The vehicle's other costs (FOR or RENT) and a rented vehicle's freight are ours: never on the bill.
  const charged = transportMode !== "EX";
  const totals = computeTotals({
    lines: lines.map((l) => ({ qty: num(l.qty), rate: num(l.rate) })),
    discountMode,
    discountValue: num(discountValue),
    transportMode,
    transportCharge: 0,
    unloadingCharge: 0,
    otherCharge: 0,
  });
  const costs = charged ? filledCharges(vehicleCosts) : [];
  const credit = party && pricing ? checkCredit(party.creditLimit, party.outstanding, totals.total) : null;

  const quantities = lines.reduce(
    (acc, l) => {
      const pid = l.productId || (products[0] ?? allProducts[0])?.id;
      const product = pid ? productById(pid) : null;
      const qty = num(l.qty);
      if (product) {
        if (!acc[product.category]) {
          acc[product.category] = { qty: 0, mt: 0 };
        }
        acc[product.category].qty += qty;
        acc[product.category].mt += toMT(qty, product.unit);
      }
      return acc;
    },
    { cement: { qty: 0, mt: 0 }, steel: { qty: 0, mt: 0 } } as Record<string, { qty: number; mt: number }>,
  );
  const freight = transportMode === "RENT" ? num(freightPerBag) * quantities.cement.qty : 0;

  const isOwner = role === "owner";
  const billNumber = Number(billNo);
  const available = products.length > 0 ? products : allProducts;
  const validLines = lines
    .map((l) => ({
      ...l,
      productId: l.productId || available[0]?.id || "",
    }))
    .filter((l) => l.productId && num(l.qty) > 0);
  const allPriced = isOwner && validLines.length > 0 && validLines.every((l) => num(l.rate) > 0);

  const discountOverLimit = totals.discountPercent > maxDiscountPercent[role];
  const needsApproval = allPriced && (Boolean(credit?.overLimit) || discountOverLimit);
  const needsReason = isOwner && needsApproval;
  const hasLines = lines.some((l) => {
    const pid = l.productId || (products[0] ?? allProducts[0])?.id;
    return pid && num(l.qty) > 0;
  });

  const missing = !party
    ? "Choose a party to continue."
    : party.kind === "cash" && cashName.trim().length < 2
      ? "Enter the cash customer's name."
    : party.kind === "cash" && cashMobile.length !== 10
      ? "Enter the cash customer's 10-digit phone number."
    : charged && unnamedCharge(vehicleCosts)
      ? "Enter a name for each vehicle cost."
    : !loadFromKnown
      ? "Choose the godown the bags are loaded from."
    : !hasLines
      ? "Enter the quantity for at least one item."
    : isOwner && allPriced && needsReason && !reason.trim()
      ? "Enter the reason before saving."
      : null;
  const actionLabel = allPriced
    ? needsApproval
      ? (isOwner ? "Save with override" : "Send for approval")
      : "Save bill"
    : "Save sale (price on approval)";
  const quantityLine = [
    quantities.cement.qty > 0 && `${formatNumber(quantities.cement.qty)} bags (${formatNumber(quantities.cement.mt, 3)} MT)`,
    quantities.steel.qty > 0 && `${formatNumber(quantities.steel.qty)} kg (${formatNumber(quantities.steel.mt, 3)} MT)`,
  ]
    .filter(Boolean)
    .join(" · ");

  function resetForm() {
    setPartyId("");
    setPartyList(parties);
    setNewCustomer(null);
    setBeforeNew("");
    setDraft({ name: "", mobile: "" });
    setCashName("");
    setCashMobile("");
    setDestination("");
    setRemarks("");
    setReason("");
    setDiscountValue("");
    const defaultProduct = godownAllowedProducts[0] ?? allProducts[0];
    setLines(defaultProduct ? [{ key: Date.now(), productId: defaultProduct.id, qty: "", rate: "" }] : []);
    setNextKey(2);
    setOwnVehicleId("");
    setRentedVehicleId("");
    setCustomerVehicle("");
    setVehicleCosts([]);
    setFreightPerBag("");
  }

  /**
   * New customer: the bill leaves the party it was on (so the Cash customer's name and phone don't show beside this
   * form), taking any name typed for a cash customer into the new customer's form.
   */
  function openNewCustomer(typed: string) {
    const fromCash = party?.kind === "cash";
    setBeforeNew(partyId);
    setPartyId("");
    const name = typed.trim() || (fromCash ? cashName.trim() : "");
    setDraft({ name, mobile: fromCash ? cashMobile : "" });
    setNewCustomer(name);
  }

  function chooseParty(next: string, picked = partyList.find((p) => p.id === next)) {
    // Picking a party closes the New customer form, so the two never show together; switching to Cash customer
    // keeps the name and number typed there.
    if (newCustomer !== null) {
      setNewCustomer(null);
      setBeforeNew("");
      if (picked?.kind === "cash") {
        if (draft.name.trim()) setCashName(draft.name.trim());
        if (draft.mobile) setCashMobile(draft.mobile);
      }
    }
    // The destination follows the party's town unless it was typed by hand.
    if (!destination || destination === (party?.place ?? "")) setDestination(picked?.place ?? "");
    setPartyId(next);
  }

  function updateLine(key: number, patch: Partial<Line>) {
    setLines((current) => current.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  /** A new godown: items it doesn't have move to the first one it does. */
  function chooseGodown(next: string) {
    setLoadFrom(next);
    const there = stockedAt(next);
    const fallback = there[0]?.id ?? allProducts[0]?.id ?? "";
    setLines((current) =>
      current.map((l) => (!l.productId || stockAt(next, l.productId) > 0 || !there[0] ? l : { ...l, productId: fallback, qty: "", rate: "" }))
    );
  }

  function addLine() {
    const available = products.length > 0 ? products : allProducts;
    const defaultProduct = available[0];
    setLines((current) => [...current, { key: nextKey, productId: defaultProduct?.id ?? "", qty: "", rate: "" }]);
    setNextKey((k) => k + 1);
  }

  async function save() {
    if (missing || saving) return;
    setSaving(true);
    const available = products.length > 0 ? products : allProducts;
    const validLines = lines
      .map((l) => ({
        ...l,
        productId: l.productId || available[0]?.id || "",
      }))
      .filter((l) => l.productId && num(l.qty) > 0)
      .map((l) => ({
        productId: l.productId,
        qty: num(l.qty),
        rate: num(l.rate),
      }));

    const allPriced = isOwner && validLines.length > 0 && validLines.every((l) => l.rate > 0);
    const status: SaleStatus = allPriced ? "saved" : "pending_approval";

    const result = await createSaleAction({
      firmId: firm.id,
      partyId,
      billDate: invoiceDate,
      receivedDate: invoiceDate,
      source: "godown",
      godownId: loadFrom,
      billNo: allPriced && billNumber > 0 ? billNumber : undefined,
      transportMode,
      transportCharge: totals.transport,
      unloadingCharge: 0,
      otherCharge: totals.charges,
      discountAmount: totals.discount,
      subtotal: totals.subtotal,
      total: totals.total,
      destination: destination || undefined,
      remarks: remarks || (party?.kind === "cash" ? `Cash: ${cashName} (${cashMobile})` : undefined),
      status,
      lines: validLines,
    });
    setSaving(false);
    if (!result.ok) {
      toast(result.error ?? "Failed to save sale");
      return;
    }

    if (result.sale.status === "saved" && result.sale.billNo) {
      toast(`Bill #${result.sale.billNo} saved successfully`);
    } else {
      toast("Sale saved successfully · Waiting for owner to enter prices & approve");
    }

    resetForm();
    router.push("/sales");
    router.refresh();
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
        <div className="flex items-center justify-between px-1">
          <p className="text-[13px] text-ink-secondary">
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
          <button
            type="button"
            onClick={resetForm}
            className="text-[12px] font-medium text-ink-secondary hover:text-ink hover:underline"
          >
            Clear form
          </button>
        </div>
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
              action={{ label: "New customer", onPick: openNewCustomer }}
            />
          </Field>
          {newCustomer !== null && (
            <NewCustomer
              parties={partyList}
              typed={newCustomer}
              typedMobile={party?.kind === "cash" || partyList.find((p) => p.id === beforeNew)?.kind === "cash" ? cashMobile : undefined}
              onDraft={setDraft}
              onCancel={() => {
                setNewCustomer(null);
                if (beforeNew) setPartyId(beforeNew);
              }}
              onDone={(picked, added) => {
                if (added) setPartyList((list) => [...list, picked]);
                chooseParty(picked.id, picked);
                setNewCustomer(null);
                toast(added ? `${picked.name} added as a customer` : `Billing ${picked.name}`);
              }}
            />
          )}
          {party?.kind === "cash" && newCustomer === null && (
            <div className="grid gap-3 rounded-2xl bg-card-subtle p-4 sm:grid-cols-2">
              <Field label="Customer name" htmlFor={`${id}-cash-name`}>
                <input id={`${id}-cash-name`} className={inputClass} maxLength={60} autoCapitalize="words" value={cashName} onChange={(e) => setCashName(e.target.value)} />
              </Field>
              <Field label="Phone number" htmlFor={`${id}-cash-mobile`}>
                <AffixInput
                  id={`${id}-cash-mobile`}
                  prefix="+91"
                  inputMode="numeric"
                  autoComplete="off"
                  value={cashMobile}
                  onChange={(e) => setCashMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                />
              </Field>
            </div>
          )}
          {credit && <CreditPanel credit={credit} billTotal={totals.total} isOwner={isOwner} />}
          <div className={cn("grid gap-4", pricing && "grid-cols-2")}>
            {pricing && (
              <Field
                label="Sales bill no."
                htmlFor={`${id}-bill`}
                hint={allPriced ? "Sales bill series (independent from purchases)" : "Next series no. (assigned on approval if unpriced)"}
              >
                <output id={`${id}-bill`} className={cn(inputClass, "flex items-center bg-card-subtle font-semibold tabular-nums text-ink")}>
                  #{billNo}
                </output>
              </Field>
            )}
            <Field label="Bill date" htmlFor={`${id}-date`}>
              <DatePicker id={`${id}-date`} label="Bill date" value={invoiceDate} onChange={setInvoiceDate} />
            </Field>
          </div>
        </section>

        <section className="surface p-5">
          <SectionTitle>Items</SectionTitle>
          <Field label="Load from" htmlFor={`${id}-from`} className="mt-3">
            <Select
              id={`${id}-from`}
              label="Load from"
              placeholder="Choose a godown"
              value={loadFrom}
              onChange={chooseGodown}
              options={godowns.map((g) => {
                const items = stockedAt(g.id).length;
                return { value: g.id, label: g.name, hint: items ? `${items} ${items === 1 ? "item" : "items"} in stock` : "No stock" };
              })}
            />
          </Field>
          {godownEmpty && <p className="mt-3 rounded-2xl bg-warning-soft px-4 py-3 text-[15px] text-ink">This godown has no linked products. Configure linked products in Settings &gt; Godowns.</p>}
          <ul className="divide-y divide-hairline">
            {lines.map((line, index) => {
              const available = godownAllowedProducts.length > 0 ? godownAllowedProducts : allProducts;
              const product = (line.productId ? productById(line.productId) : null) ?? available[0] ?? allProducts[0];
              const currentPid = line.productId || product?.id || "";
              const qty = num(line.qty);
              const rate = num(line.rate);
              if (!product) return null;
              return (
                <li key={line.key} className="space-y-3 py-4">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <ProductPicker
                        label={`Item ${index + 1}`}
                        products={available}
                        value={currentPid}
                        onChange={(v) => {
                          const next = productById(v);
                          updateLine(line.key, { productId: next.id, rate: "" });
                        }}
                      />
                    </div>
                    {lines.length > 0 && (
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
                  <div className={cn("grid gap-3", pricing ? "grid-cols-2" : "grid-cols-1")}>
                    <Field
                      label="Quantity"
                      htmlFor={`${id}-qty-${line.key}`}
                      hint={`${formatNumber(stockAt(loadFrom, product.id))} ${unitLabel[product.unit] || product.unit} in stock${toMT(qty, product.unit) > 0 ? ` · ${formatNumber(toMT(qty, product.unit), 3)} MT` : ""}`}
                      error={qty > stockAt(loadFrom, product.id) ? `Only ${formatNumber(stockAt(loadFrom, product.id))} ${unitLabel[product.unit] || product.unit} at this godown` : undefined}
                    >
                      <AffixInput
                        id={`${id}-qty-${line.key}`}
                        inputMode="decimal"
                        placeholder="0"
                        suffix={unitLabel[product.unit] || product.unit}
                        value={line.qty}
                        onChange={(e) => updateLine(line.key, { productId: currentPid, qty: e.target.value })}
                      />
                    </Field>
                    {pricing && (
                      <Field label={`Rate per ${unitLabel[product.unit] || product.unit}`} htmlFor={`${id}-rate-${line.key}`} hint="Optional · can price on approval">
                        <AffixInput
                          id={`${id}-rate-${line.key}`}
                          inputMode="decimal"
                          prefix="₹"
                          placeholder="0 (optional)"
                          value={line.rate}
                          onChange={(e) => updateLine(line.key, { productId: currentPid, rate: e.target.value })}
                        />
                      </Field>
                    )}
                  </div>
                  {pricing && (
                    <div className="flex justify-between text-[15px]">
                      <span className="text-ink-secondary">Amount</span>
                      {rate > 0 ? (
                        <span className="font-semibold tabular-nums text-ink">{formatINR(qty * rate)}</span>
                      ) : (
                        <span className="text-[13px] text-ink-secondary">Price on approval</span>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <Button variant="secondary" onClick={addLine} disabled={godownEmpty && allProducts.length === 0} className="mt-3 gap-1.5">
            <Plus size={18} strokeWidth={2.25} aria-hidden />
            Add item
          </Button>
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
                  onChange={(next) => {
                    if (transportMode !== "FOR") return setRentedVehicleId(next);
                    setOwnVehicleId(next);
                    const usual = ownVehicles.find((v) => v.id === next)?.driverId;
                    if (usual && ownDrivers.some((d) => d.id === usual)) setOwnDriverId(usual);
                  }}
                  options={(transportMode === "FOR" ? ownVehicles : rentedVehicles).map((v) => ({ value: v.id, label: v.label, hint: v.hint }))}
                />
              </Field>
            )}
            {transportMode === "FOR" && (
              <Field label="Driver" htmlFor={`${id}-driver`} hint={ownDrivers.length === 0 ? "Add drivers under People" : "Our driver"}>
                <Select
                  id={`${id}-driver`}
                  label="Driver"
                  placeholder="Choose our driver"
                  value={ownDriverId}
                  onChange={setOwnDriverId}
                  options={ownDrivers.map((d) => ({ value: d.id, label: d.name }))}
                />
              </Field>
            )}
            {transportMode === "RENT" && (
              <Field label="Driver" htmlFor={`${id}-rent-driver`} hint={rentedVehicleId ? (rentDriver ? "Comes with the rented vehicle" : "No driver saved for this vehicle") : "Filled in when you choose the vehicle"}>
                <div
                  id={`${id}-rent-driver`}
                  aria-live="polite"
                  className={cn(inputClass, "flex items-center justify-between gap-3 bg-card-subtle", !rentDriver && "text-ink-tertiary")}
                >
                  <span className="truncate">{rentDriver?.name ?? "—"}</span>
                  {rentDriver?.mobile && (
                    <a href={`tel:+91${rentDriver.mobile}`} className="shrink-0 text-[15px] tabular-nums text-link hover:underline">
                      +91 {rentDriver.mobile}
                    </a>
                  )}
                </div>
              </Field>
            )}
            <DestinationField value={destination} onChange={setDestination} destinations={destinations} />
          </div>
          {transportMode === "RENT" && (
            <Field
              label="Freight per bag"
              htmlFor={`${id}-freight`}
              hint={
                num(freightPerBag) > 0 && quantities.cement.qty > 0
                  ? `${formatNumber(quantities.cement.qty)} bags × ${formatINR(num(freightPerBag))} = ${formatINR(freight)} to the driver · not on the bill`
                  : "What the rented vehicle's driver is paid for each bag · not on the bill"
              }
            >
              <AffixInput id={`${id}-freight`} prefix="₹" suffix="/ bag" inputMode="decimal" placeholder="0" value={freightPerBag} onChange={(e) => setFreightPerBag(e.target.value)} />
            </Field>
          )}
          {charged && (
            <OtherCharges
              value={vehicleCosts}
              onChange={setVehicleCosts}
              title="Vehicle other costs"
              hint="Not added to the bill. Name each one, like Toll or Hamali."
            />
          )}
        </section>

        <section className="surface space-y-4 p-5">
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
            <Field label="Reason for the override" htmlFor={`${id}-reason`} hint="Saved with the bill in the audit history.">
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
          <h2 className="text-[17px] font-semibold tracking-[-0.3px] text-ink">{pricing ? "Bill summary" : "Sale summary"}</h2>
          <p className="mt-1 text-[13px] text-ink-secondary">From {firm.name}</p>
          {!pricing && (
            <div className="mt-4">
              <p className="text-[15px] text-ink">{quantityLine || "No items yet"}</p>
              <p className="mt-2 text-[13px] text-ink-secondary">No prices here: the owner adds the bill no., rates and charges and approves the sale.</p>
            </div>
          )}
          {pricing && (
            <>
              <dl className="mt-4 space-y-2.5 text-[15px]">
                <SummaryRow label="Items" value={formatINR(totals.subtotal)} />
                {totals.discount > 0 && <SummaryRow label="Discount" value={`− ${formatINR(totals.discount)}`} />}
              </dl>
              <div className="mt-4 border-t border-hairline pt-4">
                <p className="text-[13px] text-ink-secondary">Total</p>
                <p className="text-[34px] font-semibold leading-[41px] tracking-[-0.4px] tabular-nums text-ink">
                  {formatINR(totals.total)}
                </p>
                {quantityLine && <p className="mt-1 text-[13px] text-ink-secondary">{quantityLine}</p>}
              </div>
              {(costs.length > 0 || freight > 0) && (
                <div className="mt-4 rounded-2xl bg-card-subtle p-3">
                  <p className="text-[13px] font-medium text-ink">Vehicle costs · not on the bill</p>
                  <dl className="mt-1.5 space-y-1 text-[13px]">
                    {freight > 0 && <SummaryRow label="Freight to driver" value={formatINR(freight)} />}
                    {costs.map((c, i) => (
                      <SummaryRow key={i} label={c.name || "Other cost"} value={formatINR(c.amount)} />
                    ))}
                  </dl>
                </div>
              )}
            </>
          )}
          {missing && <p className="mt-4 text-[13px] text-ink-secondary">{missing}</p>}
          {overStock && !missing && (
            <p className="mt-2 text-[12px] text-warning">
              Note: Qty exceeds recorded godown stock ({formatNumber(stockAt(loadFrom, overStock.productId))} on hand).
            </p>
          )}
          <Button className="mt-5 w-full" disabled={Boolean(missing) || saving} onClick={save}>
            {saving ? "Saving…" : actionLabel}
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
          <Button disabled={Boolean(missing) || saving} onClick={save}>
            {saving ? "Saving…" : actionLabel}
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
