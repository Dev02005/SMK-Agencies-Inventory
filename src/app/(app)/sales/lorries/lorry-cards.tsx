"use client";

import { Truck } from "lucide-react";
import { useId, useState } from "react";
import { SectionCard } from "@/components/ui/blocks";
import { Button, ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { useDateFilter } from "@/components/ui/date-filter";
import { ExportTable } from "@/components/ui/export-table";
import { AffixInput, Field } from "@/components/ui/field";
import { RoleGuard } from "@/components/ui/sub-nav";
import { useToast } from "@/components/ui/toast";
import { addDaysISO, formatDate, formatINR } from "@/lib/format";
import { inDateFilter } from "@/lib/date-filter";
import { closeLorry, confirmLorry, useLorryBook } from "@/lib/lorry-book";

/** "Sells out in about 3 days · by 4 Nov", with a warning once that day has passed and it is still selling. */
export function SellOut({ arrivedOn, days, today, selling }: { arrivedOn: string; days?: number; today: string; selling: boolean }) {
  if (!days) return null;
  const by = addDaysISO(arrivedOn, days);
  const late = selling && today > by;
  return (
    <p className={late ? "text-[13px] font-medium text-warning" : "text-[13px] text-ink-secondary"}>
      Sells out in about {days} {days === 1 ? "day" : "days"} · by {formatDate(by)}
      {late && " · past the sell-out day"}
    </p>
  );
}

/**
 * Closing a lorry once it is sold out: whoever closes it enters the value of the lorry's material, and the owner
 * confirms it at the end. `local` lorries (noted on this device) are really closed; the sample lorry only shows how.
 */
export function CloseLorry({ id, local, today }: { id: string; local: boolean; today: string }) {
  const fieldId = useId();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const amount = parseFloat(value);

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Close lorry
      </Button>
    );
  }
  return (
    <form
      className="flex w-full flex-wrap items-end gap-3 rounded-2xl bg-card-subtle p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!(amount > 0)) return;
        if (local) closeLorry(id, amount, today);
        else toast(`Sample mode: the lorry would be closed with material worth ${formatINR(amount)}, for the owner to confirm.`);
        setOpen(false);
      }}
    >
      <Field label="Value of the lorry's material" htmlFor={`${fieldId}-value`} hint="Everything sold from this lorry" className="min-w-[200px] flex-1">
        <AffixInput id={`${fieldId}-value`} prefix="₹" inputMode="decimal" placeholder="0" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
      </Field>
      <div className="flex gap-2 pb-0.5">
        <Button variant="plain" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={!(amount > 0)}>
          Close lorry
        </Button>
      </div>
    </form>
  );
}

/** Lorries noted on this device with Lorry arrived (sample mode keeps them here until Supabase is connected). */
export function DeviceLorries({ today, serverCount }: { today: string; serverCount: number }) {
  const dates = useDateFilter();
  const lorries = useLorryBook().filter((l) => inDateFilter(l.arrivedOn, dates));
  if (lorries.length === 0) return serverCount === 0 ? <SectionCard>{dates.kind === "all" ? "No lorry is selling right now." : "No lorries for these dates."}</SectionCard> : null;
  return (
    <>
      <ExportTable
        title="Lorries noted on this device"
        columns={["Lorry", "Company", "Driver", "Invoice", "Arrived", "Status", "Material value"]}
        rows={lorries.map((l) => [
          l.lorryNo,
          l.companyName,
          l.driverName,
          l.invoiceNo,
          formatDate(l.arrivedOn),
          !l.closed ? "Selling" : l.closed.confirmed ? "Confirmed" : "Waiting for owner",
          l.closed ? formatINR(l.closed.value) : "",
        ])}
      />
      {lorries.map((l) => {
        const status = !l.closed ? "Selling" : l.closed.confirmed ? "Confirmed" : "Waiting for owner";
        return (
          <SectionCard
            key={l.id}
            title={
              <span className="flex items-center gap-2">
                <Truck size={20} strokeWidth={1.75} className="text-warning" aria-hidden />
                {l.lorryNo}
              </span>
            }
            action={<Chip tone={!l.closed ? "warning" : l.closed.confirmed ? "good" : "accent"}>{status}</Chip>}
          >
            <p className="-mt-2 text-[13px] text-ink-secondary">
              {l.companyName} · driver {l.driverName} · {l.invoiceNo ? `invoice ${l.invoiceNo}` : "no invoice number"} · arrived {formatDate(l.arrivedOn)}
            </p>
            <SellOut arrivedOn={l.arrivedOn} days={l.sellOutDays} today={today} selling={!l.closed} />
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip tone={l.invoicePaperKept ? "good" : "neutral"}>{l.invoicePaperKept ? "Invoice paper with us" : "No invoice paper"}</Chip>
              <Chip tone={l.unloadingCharges ? "warning" : "neutral"}>{l.unloadingCharges ? "Unloading charges" : "No unloading charges"}</Chip>
            </div>
            {l.closed ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
                <div>
                  <p className="text-[13px] text-ink-secondary">Material value · closed {formatDate(l.closed.on)}</p>
                  <p className="text-[22px] font-semibold tabular-nums text-ink">{formatINR(l.closed.value)}</p>
                </div>
                {!l.closed.confirmed && (
                  <RoleGuard roles={["owner"]} fallback={<p className="text-[13px] text-ink-secondary">Waiting for the owner to confirm.</p>}>
                    <Button onClick={() => confirmLorry(l.id)}>Confirm</Button>
                  </RoleGuard>
                )}
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <ButtonLink href={`/sales/new?lorry=${l.id}`}>Sell from this lorry</ButtonLink>
                <CloseLorry id={l.id} local today={today} />
              </div>
            )}
          </SectionCard>
        );
      })}
    </>
  );
}
