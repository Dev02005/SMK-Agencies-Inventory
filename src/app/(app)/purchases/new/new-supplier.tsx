"use client";

import { Check } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { createSupplier } from "./actions";

export type Supplier = { id: string; name: string; brands?: string[] };

/**
 * New purchase › Company › New supplier: the company's name (from what was typed in the search), the brands it sells
 * (so the items show only those), and optionally its place and number. Saved for everyone and picked at once.
 */
export function NewSupplier({ typed, brands, onDone, onCancel }: { typed: string; brands: string[]; onDone: (s: Supplier) => void; onCancel: () => void }) {
  const id = useId();
  const [name, setName] = useState(typed);
  const [chosen, setChosen] = useState<string[]>([]);
  const [place, setPlace] = useState("");
  const [mobile, setMobile] = useState("");
  const [problem, setProblem] = useState<string>();
  const [pending, startTransition] = useTransition();

  function save() {
    if (pending || name.trim().length < 2) return;
    startTransition(async () => {
      const result = await createSupplier({ name, brands: chosen, place, mobile });
      if (!result.ok) {
        setProblem(result.problem);
        return;
      }
      onDone(result.supplier);
    });
  }

  return (
    <section aria-label="New supplier" className="space-y-4 rounded-2xl border border-accent/30 bg-accent-soft/40 p-4">
      <h3 className="text-[16px] font-semibold text-ink">New supplier</h3>
      <Field label="Company name" htmlFor={`${id}-name`}>
        <input id={`${id}-name`} className={inputClass} maxLength={80} autoCapitalize="words" value={name} onChange={(e) => (setName(e.target.value), setProblem(undefined))} autoFocus />
      </Field>
      {brands.length > 0 && (
        <fieldset>
          <legend className="mb-1.5 text-[13px] text-ink-secondary">Brands it sells (the items show only these)</legend>
          <div className="flex flex-wrap gap-2">
            {brands.map((b) => {
              const on = chosen.includes(b);
              return (
                <button
                  key={b}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setChosen((all) => (on ? all.filter((x) => x !== b) : [...all, b]))}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[15px] transition-colors",
                    on ? "border-accent bg-accent text-white" : "border-divider bg-card text-ink hover:bg-card-subtle",
                  )}
                >
                  {on && <Check size={15} strokeWidth={2.25} aria-hidden />}
                  {b}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Place" htmlFor={`${id}-place`} hint="Optional">
          <input id={`${id}-place`} className={inputClass} maxLength={60} value={place} onChange={(e) => setPlace(e.target.value)} />
        </Field>
        <Field label="Mobile number" htmlFor={`${id}-mobile`} hint="Optional">
          <AffixInput id={`${id}-mobile`} prefix="+91" inputMode="numeric" autoComplete="off" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} />
        </Field>
      </div>
      {problem && <p className="text-[13px] text-danger">{problem}</p>}
      <div className="flex items-center gap-4">
        <Button onClick={save} disabled={pending || name.trim().length < 2}>
          {pending ? "Adding…" : "Add supplier"}
        </Button>
        <Button variant="plain" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </section>
  );
}
