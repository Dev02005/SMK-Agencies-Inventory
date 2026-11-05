"use client";

import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { createCustomer } from "./actions";
import type { SaleParty } from "./new-sale-form";

const kindLabel = { customer: "Customer", sub_dealer: "Sub-dealer" } as const;

/**
 * New sale › New customer. Whatever was typed in the party search fills the name (or the mobile number, if it was
 * digits). While typing, saved parties with that name or number show up, so an existing customer is used instead
 * of being added twice.
 */
export function NewCustomer({
  parties,
  typed,
  typedMobile,
  onDraft,
  onDone,
  onCancel,
}: {
  parties: SaleParty[];
  typed: string;
  /** A mobile number already typed elsewhere (a cash customer's), to start the form with. */
  typedMobile?: string;
  /** What is typed so far, so switching to Cash customer can keep the name and number. */
  onDraft?: (draft: { name: string; mobile: string }) => void;
  /** The party to bill: the one just added, or an existing one picked from the matches. */
  onDone: (party: SaleParty, added: boolean) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const typedDigits = typed.replace(/\D/g, "");
  const typedIsNumber = typedDigits.length >= 4 && typedDigits.length === typed.replace(/[\s+-]/g, "").length;
  const [name, setName] = useState(typedIsNumber ? "" : typed);
  const [mobile, setMobile] = useState(typedIsNumber ? typedDigits.slice(-10) : (typedMobile ?? ""));
  const [place, setPlace] = useState("");
  const [kind, setKind] = useState<"customer" | "sub_dealer">("customer");
  const [problem, setProblem] = useState<string | null>(null);
  const [existing, setExisting] = useState<SaleParty | null>(null);
  const [pending, startTransition] = useTransition();

  const q = name.trim().toLowerCase();
  const digits = mobile.replace(/\D/g, "");
  const matches = parties
    .filter((p) => p.kind === "customer" || p.kind === "sub_dealer" || p.kind === "cash")
    .filter((p) => (q.length >= 2 && p.name.toLowerCase().includes(q)) || (digits.length >= 4 && (p.mobile ?? "").includes(digits)))
    .slice(0, 3);

  return (
    <section aria-label="New customer" className="space-y-4 rounded-2xl border border-accent/30 bg-accent-soft/40 p-4">
      <h3 className="text-[16px] font-semibold text-ink">New customer</h3>
      <Segmented
        label="Customer or sub-dealer"
        value={kind}
        onChange={setKind}
        options={[
          { value: "customer", label: kindLabel.customer },
          { value: "sub_dealer", label: kindLabel.sub_dealer },
        ]}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor={`${id}-name`}>
          <input id={`${id}-name`} className={inputClass} value={name} onChange={(e) => (setName(e.target.value), onDraft?.({ name: e.target.value, mobile }))} maxLength={80} autoCapitalize="words" autoFocus={!typedIsNumber} />
        </Field>
        <Field label="Mobile number" htmlFor={`${id}-mobile`}>
          <AffixInput
            id={`${id}-mobile`}
            prefix="+91"
            inputMode="numeric"
            value={mobile}
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, "").slice(0, 10);
              setMobile(next);
              onDraft?.({ name, mobile: next });
            }}
            autoFocus={typedIsNumber}
          />
        </Field>
      </div>
      <Field label="Place" htmlFor={`${id}-place`} hint="Village or town; also fills the destination">
        <input id={`${id}-place`} className={inputClass} value={place} onChange={(e) => setPlace(e.target.value)} maxLength={60} autoCapitalize="words" />
      </Field>

      {matches.length > 0 && (
        <div className="rounded-xl bg-card p-2">
          <p className="px-2 pb-1 text-[12px] text-ink-tertiary">Already saved</p>
          <ul className="divide-y divide-hairline">
            {matches.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-2 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] text-ink">{p.name}</span>
                  <span className="block truncate text-[12px] text-ink-secondary">{[p.place, p.mobile && `+91 ${p.mobile}`].filter(Boolean).join(" · ")}</span>
                </span>
                <Button variant="plain" onClick={() => onDone(p, false)}>
                  Use
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {problem && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-[13px] text-danger">
          {problem}
          {existing && (
            <Button variant="plain" onClick={() => onDone(existing, false)}>
              Use {existing.name}
            </Button>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="plain" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={pending || name.trim().length < 2 || digits.length !== 10}
          onClick={() => {
            setProblem(null);
            setExisting(null);
            startTransition(async () => {
              const result = await createCustomer({ name, mobile: digits, place, kind });
              if (result.ok) onDone(result.party, true);
              else {
                setProblem(result.problem);
                setExisting(result.existing ?? null);
              }
            });
          }}
        >
          {pending ? "Adding…" : `Add ${kindLabel[kind].toLowerCase()}`}
        </Button>
      </div>
    </section>
  );
}
