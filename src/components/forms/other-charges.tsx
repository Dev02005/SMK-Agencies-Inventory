"use client";

import { Plus, X } from "lucide-react";
import { useId } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { AffixInput, inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";

/** One named charge as typed ("Hamali", "500"). */
export type OtherCharge = { key: number; name: string; amount: string };

const num = (v: string) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);

/** The charges with an amount, as numbers. */
export const filledCharges = (list: OtherCharge[]) => list.filter((c) => num(c.amount) > 0).map((c) => ({ name: c.name.trim(), amount: num(c.amount) }));
/** Their total. */
export const chargesTotal = (list: OtherCharge[]) => list.reduce((s, c) => s + num(c.amount), 0);
/** A charge with an amount but no name, if any. */
export const unnamedCharge = (list: OtherCharge[]) => list.some((c) => num(c.amount) > 0 && !c.name.trim());
/** Saved charges back into rows to edit. */
export const toChargeRows = (saved: { name: string; amount: number }[] | undefined): OtherCharge[] =>
  (saved ?? []).map((c, i) => ({ key: i + 1, name: c.name, amount: String(c.amount) }));

/**
 * Other charges, each with its own name and amount (Hamali ₹500, Toll ₹150…): "Add charge" adds the first, + adds
 * more, × removes one. Used wherever a form has other charges.
 */
export function OtherCharges({
  value,
  onChange,
  title = "Other charges",
  hint = "Optional. Name each charge, like Hamali or Toll.",
}: {
  value: OtherCharge[];
  onChange: (next: OtherCharge[]) => void;
  title?: string;
  hint?: string;
}) {
  const id = useId();
  const add = () => onChange([...value, { key: Math.max(0, ...value.map((c) => c.key)) + 1, name: "", amount: "" }]);
  const update = (key: number, patch: Partial<OtherCharge>) => onChange(value.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[15px] font-medium text-ink">{title}</p>
          {hint && <p className="text-[13px] text-ink-secondary">{hint}</p>}
        </div>
        {value.length === 0 && (
          <Button variant="secondary" onClick={add} className="shrink-0 gap-1.5">
            <Plus size={17} strokeWidth={2} aria-hidden />
            Add charge
          </Button>
        )}
      </div>
      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((c, index) => {
            const nameMissing = num(c.amount) > 0 && !c.name.trim();
            return (
              <li key={c.key} className="flex items-start gap-2">
                <div className="min-w-0 flex-[3]">
                  <label htmlFor={`${id}-name-${c.key}`} className="sr-only">
                    Charge {index + 1} name
                  </label>
                  <input
                    id={`${id}-name-${c.key}`}
                    className={cn(inputClass, nameMissing && "border-danger")}
                    placeholder="Charge name"
                    maxLength={40}
                    value={c.name}
                    onChange={(e) => update(c.key, { name: e.target.value })}
                    aria-invalid={nameMissing || undefined}
                    autoFocus={index === value.length - 1 && !c.name && !c.amount}
                  />
                </div>
                <div className="min-w-0 flex-[2]">
                  <label htmlFor={`${id}-amount-${c.key}`} className="sr-only">
                    Charge {index + 1} amount
                  </label>
                  <AffixInput
                    id={`${id}-amount-${c.key}`}
                    inputMode="decimal"
                    prefix="₹"
                    placeholder="0"
                    value={c.amount}
                    onChange={(e) => update(c.key, { amount: e.target.value })}
                  />
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${c.name.trim() || `charge ${index + 1}`}`}
                  onClick={() => onChange(value.filter((x) => x.key !== c.key))}
                  className="mt-1 grid size-10 shrink-0 place-items-center rounded-full text-ink-secondary hover:bg-hairline"
                >
                  <X size={18} strokeWidth={2} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {value.length > 0 && (
        <IconButton label="Add another charge" onClick={add}>
          <Plus size={20} strokeWidth={2} aria-hidden />
        </IconButton>
      )}
    </div>
  );
}
