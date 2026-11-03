"use client";

import { useId, useState } from "react";
import { SectionCard } from "@/components/ui/blocks";
import { Button } from "@/components/ui/button";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { formatINR, formatNumber } from "@/lib/format";
import { computeTotals, type TransportMode } from "@/lib/sales";

export type RequestLine = { name: string; unit: "bag" | "kg"; unitLabel: string; qty: number; mt: number };

const num = (v: string) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);

/**
 * The owner's side of a sale saved by staff: they sent the items and quantities, with no prices. The owner gives it
 * a bill no., enters the rates, discount and charges, and approves it (or rejects it). Nothing is billed with an
 * amount the owner did not enter.
 */
export function ConfirmRequest({
  lines,
  requestedBy,
  transportMode,
  nextBillNo,
}: {
  lines: RequestLine[];
  requestedBy?: string;
  transportMode: TransportMode;
  /** The next number in the bill series, filled in for the owner to keep or change. */
  nextBillNo: number;
}) {
  const id = useId();
  const toast = useToast();
  const [billNo, setBillNo] = useState(String(nextBillNo));
  const [rates, setRates] = useState(lines.map(() => ""));
  const [discount, setDiscount] = useState("");
  const [transport, setTransport] = useState("");
  const [other, setOther] = useState("");
  const charged = transportMode !== "EX";

  const totals = computeTotals({
    lines: lines.map((l, i) => ({ qty: l.qty, rate: num(rates[i]) })),
    discountMode: "amount",
    discountValue: num(discount),
    transportMode,
    transportCharge: transportMode === "FOR" ? num(transport) : 0,
    unloadingCharge: 0,
    otherCharge: charged ? num(other) : 0,
  });
  const bill = Number(billNo);
  const missing = !(Number.isInteger(bill) && bill > 0)
    ? "Enter the bill no."
    : lines.some((_, i) => num(rates[i]) <= 0)
      ? "Enter the rate for every item."
      : null;

  return (
    <SectionCard title="Bill no. and prices" className="lg:col-span-2">
      <p className="-mt-2 text-[13px] text-ink-secondary">
        {requestedBy ? `${requestedBy} saved` : "Staff saved"} this sale with the items and quantities. Give it a bill no., enter the rates, discount and charges, then approve it.
      </p>
      <Field label="Bill no." htmlFor={`${id}-bill`} hint="The next number in the series; change it if needed" className="mt-4 max-w-[220px]">
        <input id={`${id}-bill`} className={inputClass} inputMode="numeric" value={billNo} onChange={(e) => setBillNo(e.target.value.replace(/\D/g, ""))} />
      </Field>
      <ul className="mt-2 divide-y divide-hairline">
        {lines.map((l, i) => (
          <li key={i} className="grid grid-cols-[minmax(0,1fr)_140px] items-end gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_150px_120px]">
            <div className="min-w-0 self-center">
              <p className="truncate text-[15px] font-medium text-ink">{l.name}</p>
              <p className="text-[13px] text-ink-secondary">
                {formatNumber(l.qty)} {l.unitLabel} · {formatNumber(l.mt, 3)} MT
              </p>
            </div>
            <Field label={`Rate per ${l.unit}`} htmlFor={`${id}-rate-${i}`}>
              <AffixInput
                id={`${id}-rate-${i}`}
                prefix="₹"
                inputMode="decimal"
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
        {charged && (
          <>
            {transportMode === "FOR" && (
              <Field label="Transport" htmlFor={`${id}-transport`}>
                <AffixInput id={`${id}-transport`} prefix="₹" inputMode="decimal" placeholder="0" value={transport} onChange={(e) => setTransport(e.target.value)} />
              </Field>
            )}
            <Field label="Other" htmlFor={`${id}-other`} hint="Optional">
              <AffixInput id={`${id}-other`} prefix="₹" inputMode="decimal" placeholder="0" value={other} onChange={(e) => setOther(e.target.value)} />
            </Field>
          </>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-hairline pt-4">
        <div>
          <p className="text-[13px] text-ink-secondary">Total</p>
          <p className="text-[28px] font-semibold tabular-nums tracking-[-0.4px] text-ink">{formatINR(totals.total)}</p>
          {missing && <p className="text-[13px] text-ink-secondary">{missing}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => toast("Sample mode: the sale would be rejected and the staff member told why.")}>
            Reject
          </Button>
          <Button
            disabled={Boolean(missing)}
            onClick={() => toast(`Sample mode: Bill ${bill} for ${formatINR(totals.total)} would be approved and posted to the ledger and stock once Supabase is connected.`)}
          >
            Approve sale
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
