"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { chargesTotal, filledCharges, OtherCharges, unnamedCharge, type OtherCharge } from "@/components/forms/other-charges";
import { SectionCard } from "@/components/ui/blocks";
import { Button } from "@/components/ui/button";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { formatINR, formatNumber } from "@/lib/format";
import { computeTotals, type TransportMode } from "@/lib/sales";
import { approveSaleAction, rejectSaleAction } from "../actions";

export type RequestLine = { productId: string; name: string; unit: string; unitLabel: string; qty: number; mt: number; initialRate?: number };

const num = (v: string) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);

/**
 * The owner's side of a sale saved by staff or saved without prices: they sent the items and quantities.
 * The owner confirms or edits the bill no., enters the rates, discount and charges, and approves it (or rejects it).
 */
export function ConfirmRequest({
  saleId,
  lines,
  requestedBy,
  transportMode,
  nextBillNo,
}: {
  saleId: string;
  lines: RequestLine[];
  requestedBy?: string;
  transportMode: TransportMode;
  /** The next number in the bill series, filled in for the owner to keep or change. */
  nextBillNo: number;
}) {
  const id = useId();
  const router = useRouter();
  const toast = useToast();
  const [billNo, setBillNo] = useState(String(nextBillNo));
  const [rates, setRates] = useState(lines.map((l) => (l.initialRate ? String(l.initialRate) : "")));
  const [discount, setDiscount] = useState("");
  const [vehicleCosts, setVehicleCosts] = useState<OtherCharge[]>([]);
  const [saving, setSaving] = useState(false);
  const charged = transportMode !== "EX";

  const totals = computeTotals({
    lines: lines.map((l, i) => ({ qty: l.qty, rate: num(rates[i]) })),
    discountMode: "amount",
    discountValue: num(discount),
    transportMode,
    transportCharge: 0,
    unloadingCharge: 0,
    otherCharge: 0,
  });
  const bill = Number(billNo);
  const missing = !(Number.isInteger(bill) && bill > 0)
    ? "Enter a valid bill no."
    : lines.some((_, i) => num(rates[i]) <= 0)
      ? "Enter the rate for every item."
      : charged && unnamedCharge(vehicleCosts)
        ? "Enter a name for each vehicle cost."
        : null;

  async function handleApprove() {
    if (missing || saving) return;
    setSaving(true);
    const result = await approveSaleAction({
      saleId,
      billNo: bill,
      rates: lines.map((l, i) => ({ productId: l.productId, rate: num(rates[i]) })),
      discountAmount: num(discount),
      vehicleCosts: charged ? filledCharges(vehicleCosts) : undefined,
    });
    setSaving(false);
    if (!result.ok) {
      toast(result.error ?? "Failed to approve sale");
      return;
    }
    toast(`Bill #${bill} approved and finalized successfully`);
    router.refresh();
  }

  async function handleReject() {
    if (saving) return;
    if (!confirm("Are you sure you want to reject this sale request?")) return;
    setSaving(true);
    const result = await rejectSaleAction(saleId, "Rejected by owner");
    setSaving(false);
    if (!result.ok) {
      toast(result.error ?? "Failed to reject sale");
      return;
    }
    toast("Sale request rejected");
    router.refresh();
  }

  return (
    <SectionCard title="Bill no. and prices" className="lg:col-span-2">
      <p className="-mt-2 text-[13px] text-ink-secondary">
        {requestedBy ? `${requestedBy} saved` : "Godown staff saved"} this sale with items and quantities. Confirm the bill no., enter rates and discounts, and approve to finalize.
      </p>
      <Field label="Bill no." htmlFor={`${id}-bill`} hint="Independent sales bill number sequence" className="mt-4 max-w-[260px]">
        <AffixInput
          id={`${id}-bill`}
          prefix="#"
          inputMode="numeric"
          value={billNo}
          onChange={(e) => setBillNo(e.target.value.replace(/\D/g, ""))}
        />
      </Field>
      <ul className="mt-2 divide-y divide-hairline">
        {lines.map((l, i) => (
          <li key={i} className="grid grid-cols-[minmax(0,1fr)_140px] items-end gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_150px_120px]">
            <div className="min-w-0 self-center">
              <p className="truncate text-[15px] font-medium text-ink">{l.name}</p>
              <p className="text-[13px] text-ink-secondary">
                {formatNumber(l.qty)} {l.unitLabel}{l.mt > 0 ? ` · ${formatNumber(l.mt, 3)} MT` : ""}
              </p>
            </div>
            <Field label={`Rate per ${l.unit}`} htmlFor={`${id}-rate-${i}`}>
              <AffixInput
                id={`${id}-rate-${i}`}
                prefix="₹"
                inputMode="decimal"
                placeholder="0"
                value={rates[i]}
                onChange={(e) => setRates((current) => current.map((r, n) => (n === i ? e.target.value : r)))}
              />
            </Field>
            <p className="col-span-2 text-right text-[15px] font-medium tabular-nums text-ink sm:col-span-1 sm:mb-3">{formatINR(l.qty * num(rates[i]))}</p>
          </li>
        ))}
      </ul>
      <div className="mt-2 grid grid-cols-2 gap-3 border-t border-hairline pt-4 sm:grid-cols-4">
        <Field label="Discount" htmlFor={`${id}-discount`}>
          <AffixInput id={`${id}-discount`} prefix="₹" inputMode="decimal" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </Field>
      </div>
      {charged && (
        <div className="mt-4 border-t border-hairline pt-4">
          <OtherCharges value={vehicleCosts} onChange={setVehicleCosts} title="Vehicle other costs" hint="Not added to the bill. Name each one, like Toll or Hamali." />
          {chargesTotal(vehicleCosts) > 0 && <p className="mt-2 text-[13px] text-ink-secondary">Vehicle costs {formatINR(chargesTotal(vehicleCosts))} · not on the bill</p>}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-hairline pt-4">
        <div>
          <p className="text-[13px] text-ink-secondary">Total bill amount</p>
          <p className="text-[28px] font-semibold tabular-nums tracking-[-0.4px] text-ink">{formatINR(totals.total)}</p>
          {missing && <p className="text-[13px] text-warning">{missing}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={saving} onClick={handleReject}>
            Reject
          </Button>
          <Button
            disabled={Boolean(missing) || saving}
            onClick={handleApprove}
          >
            {saving ? "Saving…" : "Approve sale"}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
