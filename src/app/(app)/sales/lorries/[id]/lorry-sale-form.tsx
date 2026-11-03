"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { SubmitBar } from "@/components/ui/submit-bar";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import type { Lorry, Product } from "@/lib/data/types";
import { formatINR, formatNumber } from "@/lib/format";
import { lineQty } from "@/lib/quantities";
import { unitLabel } from "@/lib/sales";
import { updateLorrySale } from "../../../purchases/lorries/actions";

const num = (v: string) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);
const text = (n: number | undefined) => (n ? String(n) : "");

/**
 * Updating a company lorry's sale, laid out like a godown sale: what was sold of each item and at what rate, the tick
 * boxes, charges received, and whether it is sold out. It can be saved while still selling and updated again later;
 * marking it sold out ends the reminder.
 */
export function LorrySaleForm({ lorry, products, today }: { lorry: Lorry; products: Product[]; today: string }) {
  const id = useId();
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const saved = (productId: string) => lorry.sale?.lines.find((x) => x.productId === productId);
  // Each item starts at what was saved before, or everything that came on the lorry.
  const [lines, setLines] = useState(
    lorry.lines.map((l) => ({ productId: l.productId, loaded: l.qty, qty: String(saved(l.productId)?.qty ?? l.qty), rate: text(saved(l.productId)?.rate) })),
  );
  const [paperKept, setPaperKept] = useState(lorry.invoicePaperKept);
  const [unloadingPaid, setUnloadingPaid] = useState(lorry.unloadingCharges);
  const [unloading, setUnloading] = useState(text(lorry.sale?.unloading));
  const [other, setOther] = useState(text(lorry.sale?.other));
  const [notes, setNotes] = useState(lorry.sale?.notes ?? lorry.sold?.notes ?? "");
  const [status, setStatus] = useState<"selling" | "sold">(lorry.sold ? "sold" : "selling");
  const [soldOn, setSoldOn] = useState(lorry.sold?.on ?? today);

  const product = (pid: string) => products.find((p) => p.id === pid);
  const itemsTotal = lines.reduce((s, l) => s + num(l.qty) * num(l.rate), 0);
  const total = itemsTotal + (unloadingPaid ? num(unloading) : 0) + num(other);
  const margin = lorry.invoiceValue ? total - lorry.invoiceValue : undefined;

  const over = lines.find((l) => num(l.qty) > l.loaded);
  const unpriced = lines.find((l) => num(l.qty) > 0 && !(num(l.rate) > 0));
  const missing = over
    ? `Sold can't be more than came on the lorry (${formatNumber(over.loaded)} ${product(over.productId)?.unit === "kg" ? "kg" : "bags"}).`
    : unpriced
      ? `Enter the rate for ${product(unpriced.productId)?.name ?? "each item sold"}.`
      : status === "sold" && !(total > 0)
        ? "Enter what was sold before marking it sold out."
        : status === "sold" && soldOn < lorry.invoiceDate
          ? "It can't sell out before the invoice date."
          : null;

  function save() {
    if (missing || pending) return;
    startTransition(async () => {
      const result = await updateLorrySale(lorry.id, {
        lines: lines.map((l) => ({ productId: l.productId, qty: num(l.qty), rate: num(l.rate) })),
        invoicePaperKept: paperKept,
        unloadingCharges: unloadingPaid,
        unloading: num(unloading),
        other: num(other),
        notes,
        soldOut: status === "sold",
        soldOn,
      });
      if (!result.ok) {
        toast(result.problem);
        return;
      }
      toast(status === "sold" ? `Lorry ${lorry.lorryNo} sold out: ${formatINR(total)}` : `Lorry ${lorry.lorryNo} updated: ${formatINR(total)} so far`);
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
      <section className="surface p-5">
        <h2 className="text-[17px] font-semibold tracking-[-0.3px] text-ink">Sold from this lorry</h2>
        <p className="mt-0.5 text-[13px] text-ink-secondary">How much of each item is sold and at what rate.</p>
        <ul className="divide-y divide-hairline">
          {lines.map((l, i) => {
            const p = product(l.productId);
            const unit = p?.unit ?? "bag";
            return (
              <li key={l.productId} className="space-y-3 py-4">
                <p className="flex justify-between gap-3 text-[15px]">
                  <span className="font-medium text-ink">{p?.name ?? "Item"}</span>
                  <span className="text-ink-secondary">{lineQty(l.loaded, p)} came on it</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Sold" htmlFor={`${id}-qty-${i}`}>
                    <AffixInput
                      id={`${id}-qty-${i}`}
                      inputMode="decimal"
                      suffix={unitLabel[unit]}
                      value={l.qty}
                      onChange={(e) => setLines((all) => all.map((x, n) => (n === i ? { ...x, qty: e.target.value } : x)))}
                    />
                  </Field>
                  <Field label={`Rate per ${unit}`} htmlFor={`${id}-rate-${i}`}>
                    <AffixInput
                      id={`${id}-rate-${i}`}
                      prefix="₹"
                      inputMode="decimal"
                      value={l.rate}
                      onChange={(e) => setLines((all) => all.map((x, n) => (n === i ? { ...x, rate: e.target.value } : x)))}
                    />
                  </Field>
                </div>
                <p className="flex justify-between text-[15px]">
                  <span className="text-ink-secondary">Amount{num(l.qty) < l.loaded ? ` · ${formatNumber(l.loaded - num(l.qty))} left` : ""}</span>
                  <span className="font-semibold tabular-nums text-ink">{formatINR(num(l.qty) * num(l.rate))}</span>
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="surface space-y-4 p-5">
        <div className="space-y-1">
          <Tick checked={paperKept} onChange={setPaperKept} label="Physical invoice paper copy" hint="We have the paper copy of the company's invoice" />
          <Tick checked={unloadingPaid} onChange={setUnloadingPaid} label="Unloading charges" hint="Unloading charges are paid to us" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {unloadingPaid && (
            <Field label="Unloading charges received" htmlFor={`${id}-unloading`}>
              <AffixInput id={`${id}-unloading`} prefix="₹" inputMode="decimal" placeholder="0" value={unloading} onChange={(e) => setUnloading(e.target.value)} />
            </Field>
          )}
          <Field label="Other" htmlFor={`${id}-other`} hint="Optional">
            <AffixInput id={`${id}-other`} prefix="₹" inputMode="decimal" placeholder="0" value={other} onChange={(e) => setOther(e.target.value)} />
          </Field>
        </div>
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
                <dt className="text-ink-secondary">Invoice value</dt>
                <dd className="tabular-nums text-ink">{formatINR(lorry.invoiceValue)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-secondary">Margin</dt>
                <dd className={cn("font-semibold tabular-nums", (margin ?? 0) >= 0 ? "text-good" : "text-danger")}>{formatINR(margin ?? 0)}</dd>
              </div>
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
