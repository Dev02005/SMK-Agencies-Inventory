"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { Firm } from "@/lib/data/types";
import { saveFirm } from "./actions";

/** One firm's details and the Primary firm tick; with no firm it adds a new one. */
export function FirmForm({ firm, onDone }: { firm?: Firm; onDone?: () => void }) {
  const id = useId();
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(firm?.name ?? "");
  const [gstin, setGstin] = useState(firm?.gstin ?? "");
  const [phone, setPhone] = useState(firm?.phone ?? "");
  const [address, setAddress] = useState(firm?.address ?? "");
  const [primary, setPrimary] = useState(firm?.primary ?? false);
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isPrimary = Boolean(firm?.primary);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setProblem(null);
        startTransition(async () => {
          const result = await saveFirm({ id: firm?.id, name, gstin, phone, address, primary });
          if (!result.ok) {
            setProblem(result.problem);
            return;
          }
          toast(firm ? `${name.trim()} saved` : `${name.trim()} added`);
          onDone?.();
          router.refresh();
        });
      }}
    >
      <Field label="Firm name" htmlFor={`${id}-name`}>
        <input id={`${id}-name`} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="GSTIN" htmlFor={`${id}-gstin`}>
          <input
            id={`${id}-gstin`}
            className={inputClass}
            value={gstin}
            onChange={(e) => setGstin(e.target.value.toUpperCase())}
            maxLength={15}
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="15 letters and numbers"
          />
        </Field>
        <Field label="Phone" htmlFor={`${id}-phone`}>
          <AffixInput id={`${id}-phone`} prefix="+91" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} />
        </Field>
      </div>
      <Field label="Address" htmlFor={`${id}-address`}>
        <input id={`${id}-address`} className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} />
      </Field>
      <label className={`flex items-start gap-3 rounded-xl px-1 py-2 ${isPrimary ? "" : "cursor-pointer hover:bg-card-subtle"}`}>
        <Checkbox className="mt-0.5" checked={primary} disabled={isPrimary} onChange={(e) => setPrimary(e.target.checked)} />
        <span>
          <span className="block text-[15px] text-ink">Primary firm</span>
          <span className="block text-[13px] text-ink-secondary">
            {isPrimary
              ? "Sales are billed from this firm. To change it, tick Primary firm on another firm and save."
              : "Tick to bill sales from this firm instead. Purchases can be made in any firm."}
          </span>
        </span>
      </label>
      {problem && (
        <p role="alert" className="text-[13px] text-danger">
          {problem}
        </p>
      )}
      <div className="flex justify-end gap-2">
        {onDone && (
          <Button variant="plain" onClick={onDone}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending ? "Saving…" : firm ? "Save details" : "Add firm"}
        </Button>
      </div>
    </form>
  );
}
