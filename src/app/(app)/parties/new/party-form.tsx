"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { SubmitBar } from "@/components/ui/submit-bar";
import { useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { createParty } from "../actions";

type Kind = "customer" | "sub_dealer" | "company" | "lorry_owner";

export function PartyForm({ staff }: { staff: { id: string; name: string }[] }) {
  const id = useId();
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<Kind>("customer");
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [gstin, setGstin] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [opening, setOpening] = useState("");
  const [openingSide, setOpeningSide] = useState<"dr" | "cr">("dr");
  const [assignedTo, setAssignedTo] = useState("");
  const [remarks, setRemarks] = useState("");

  const sellsToThem = kind === "customer" || kind === "sub_dealer";
  const mobileError = mobile && !/^\d{10}$/.test(mobile) ? "Enter a 10-digit mobile number." : null;
  const gstinError = gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(gstin) ? "This doesn't look like a GSTIN." : null;
  const missing = !name.trim()
    ? "Enter the party name."
    : sellsToThem && !creditLimit
      ? "Set a credit limit (0 for cash only)."
      : mobileError || gstinError;

  function save() {
    if (missing || pending) return;
    const amount = parseFloat(opening) || 0;
    startTransition(async () => {
      const result = await createParty({
        kind,
        name,
        place,
        mobile,
        email,
        gstin,
        creditLimit: sellsToThem ? parseFloat(creditLimit) || 0 : null,
        openingBalance: openingSide === "dr" ? amount : -amount,
        assignedTo,
      });
      if (!result.ok) {
        toast(result.problem);
        return;
      }
      toast(`${name.trim()} added`);
      router.push(`/parties/${result.id}`);
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
      <section className="surface space-y-4 p-5">
        <Segmented
          label="Party type"
          value={kind}
          onChange={setKind}
          options={[
            { value: "customer", label: "Customer" },
            { value: "sub_dealer", label: "Sub-dealer" },
            { value: "company", label: "Supplier" },
            { value: "lorry_owner", label: "Lorry" },
          ]}
        />
        <Field label="Party name" htmlFor={`${id}-name`}>
          <input id={`${id}-name`} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Village / town" htmlFor={`${id}-place`}>
          <input id={`${id}-place`} className={inputClass} value={place} onChange={(e) => setPlace(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mobile number" htmlFor={`${id}-mobile`} error={mobileError} hint="Used for calls and WhatsApp reminders">
            <AffixInput
              id={`${id}-mobile`}
              prefix="+91"
              inputMode="numeric"
              maxLength={10}
              className="pl-14"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
            />
          </Field>
          <Field label="Email" htmlFor={`${id}-email`}>
            <input id={`${id}-email`} type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
        <Field label="GSTIN" htmlFor={`${id}-gstin`} error={gstinError}>
          <input
            id={`${id}-gstin`}
            className={cn(inputClass, "uppercase")}
            maxLength={15}
            value={gstin}
            onChange={(e) => setGstin(e.target.value.toUpperCase().trim())}
          />
        </Field>
      </section>

      <section className="surface space-y-4 p-5">
        {sellsToThem && (
          <Field label="Credit limit" htmlFor={`${id}-limit`} hint="Sales above this need the owner's approval">
            <AffixInput id={`${id}-limit`} prefix="₹" inputMode="decimal" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
          </Field>
        )}
        <div className="grid grid-cols-[minmax(0,1fr)_140px] items-end gap-3">
          <Field label="Opening balance" htmlFor={`${id}-opening`}>
            <AffixInput id={`${id}-opening`} prefix="₹" inputMode="decimal" placeholder="0" value={opening} onChange={(e) => setOpening(e.target.value)} />
          </Field>
          <Segmented
            label="Opening balance side"
            value={openingSide}
            onChange={setOpeningSide}
            className="mb-1"
            options={[
              { value: "dr", label: "Dr" },
              { value: "cr", label: "Cr" },
            ]}
          />
        </div>
        <p className="-mt-2 text-[13px] text-ink-secondary">Dr = they owe us. Cr = we owe them.</p>
        {sellsToThem && (
          <Field label="Staff in charge" htmlFor={`${id}-staff`}>
            <Select
              id={`${id}-staff`}
              label="Staff in charge"
              value={assignedTo}
              onChange={setAssignedTo}
              options={[{ value: "", label: "Office (no staff member)" }, ...staff.map((s) => ({ value: s.id, label: s.name }))]}
            />
          </Field>
        )}
        <Field label="Remarks" htmlFor={`${id}-remarks`}>
          <textarea id={`${id}-remarks`} rows={3} className={cn(inputClass, "h-auto py-3")} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </Field>
      </section>

      <SubmitBar label={pending ? "Saving…" : "Save party"} disabled={Boolean(missing) || pending} hint={missing} onSubmit={save} />
    </form>
  );
}
