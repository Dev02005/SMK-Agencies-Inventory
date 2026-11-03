"use client";

import { useId, useState } from "react";
import { SectionCard } from "@/components/ui/blocks";
import { Button } from "@/components/ui/button";
import { AffixInput, Field } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { formatINR, formatNumber } from "@/lib/format";
import { computeTotals, type TransportMode } from "@/lib/sales";

export type RequestLine = { name: string; unit: "bag" | "kg"; unitLabel: string; qty: number; mt: number; rate: number; listRate: number };

const num = (v: string) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);

/**
 * The owner's side of a staff member's sale request: the items and quantities came from them; the owner enters
 * the rates, discount and charges here and confirms the sale (or rejects it). No sale is saved with amounts that
 * the owner did not enter.
 */
export function ConfirmRequest({
  lines,
  requestedBy,
  transportMode,
  charges,
  discount: initialDiscount,
}: {
  lines: RequestLine[];
  requestedBy?: string;
  transportMode: TransportMode;
  charges: { transport: number; unloading: number; other: number };
  discount: number;
}) {
  const id = useId();
  const toast = useToast();
  const [rates, setRates] = useState(lines.map((l) => (l.rate || l.listRate ? String(l.rate || l.listRate) : "")));
  const [discount, setDiscount] = useState(initialDiscount ? String(initialDiscount) : "");
  const [transport, setTransport] = useState(charges.transport ? String(charges.transport) : "");
  const [other, setOther] = useState(charges.other ? String(charges.other) : "");
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
  const ready = lines.every((_, i) => num(rates[i]) > 0);

  return (
    <SectionCard title="Set rates and confirm" className="lg:col-span-2">
      <p className="-mt-2 text-[13px] text-ink-secondary">
        {requestedBy ? `${requestedBy} sent` : "Staff sent"} the items and quantities. Enter the rates, discount and charges, then confirm the sale.
      </p>
      <ul className="mt-2 divide-y divide-hairline">
        {lines.map((l, i) => (
          <li key={i} className="grid grid-cols-[minmax(0,1fr)_140px] items-end gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_150px_120px]">
            <div className="min-w-0 self-center">
              <p className="truncate text-[15px] font-medium text-ink">{l.name}</p>
              <p className="text-[13px] text-ink-secondary">
                {formatNumber(l.qty)} {l.unitLabel} · {formatNumber(l.mt, 3)} MT{l.listRate > 0 && ` · list ${formatINR(l.listRate)}`}
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
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => toast("Sample mode: the request would be rejected and the staff member told why.")}>
            Reject
          </Button>
          <Button
            disabled={!ready}
            onClick={() => toast(`Sample mode: the sale of ${formatINR(totals.total)} would be confirmed and posted to the ledger and stock once Supabase is connected.`)}
          >
            Confirm sale
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
