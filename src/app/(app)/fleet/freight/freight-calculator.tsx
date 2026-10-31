"use client";

import { useId, useState } from "react";
import { AffixInput, Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import type { FreightRate } from "@/lib/data/types";
import { formatINR } from "@/lib/format";

/** Freight for a load: bags × per-bag rate + steel MT × per-MT rate, never below the place's minimum. */
export function FreightCalculator({ rates }: { rates: FreightRate[] }) {
  const id = useId();
  const [placeId, setPlaceId] = useState(rates[3]?.id ?? rates[0].id);
  const [bags, setBags] = useState("100");
  const [kg, setKg] = useState("");
  const rate = rates.find((r) => r.id === placeId)!;
  const raw = (parseFloat(bags) || 0) * rate.perBag + ((parseFloat(kg) || 0) / 1000) * rate.perMT;
  const charge = raw > 0 ? Math.max(raw, rate.minimum) : 0;

  return (
    <section className="surface space-y-4 p-5">
      <h2 className="text-[17px] font-semibold tracking-[-0.3px] text-ink">Work out freight</h2>
      <Field label="Deliver to" htmlFor={`${id}-place`}>
        <Select id={`${id}-place`} label="Deliver to" value={placeId} onChange={setPlaceId} options={rates.map((r) => ({ value: r.id, label: r.place, hint: `${r.distanceKm} km` }))} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cement" htmlFor={`${id}-bags`}>
          <AffixInput id={`${id}-bags`} inputMode="decimal" suffix="bags" value={bags} onChange={(e) => setBags(e.target.value)} />
        </Field>
        <Field label="Steel" htmlFor={`${id}-kg`}>
          <AffixInput id={`${id}-kg`} inputMode="decimal" suffix="kg" value={kg} onChange={(e) => setKg(e.target.value)} placeholder="0" />
        </Field>
      </div>
      <div className="flex items-baseline justify-between border-t border-hairline pt-3">
        <span className="text-[15px] text-ink-secondary">Freight</span>
        <span className="text-[28px] font-semibold tabular-nums tracking-[-0.4px] text-ink">{formatINR(charge)}</span>
      </div>
      {raw > 0 && raw < rate.minimum && <p className="text-[13px] text-ink-secondary">Minimum charge for {rate.place} applies.</p>}
    </section>
  );
}
