"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { SectionCard } from "@/components/ui/blocks";
import { Button } from "@/components/ui/button";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { updateStaff } from "./actions";

export type VehicleOption = { id: string; label: string; hint?: string };

/**
 * The owner's card on a staff member's page: name, mobile number, designation and, for a driver, the vehicle they
 * drive (the one sales fill them in for). "Edit" opens the fields; saving shows the change everywhere.
 */
export function StaffEditor({
  person,
  vehicles,
}: {
  person: { id: string; name: string; mobile: string; designation: string; isDriver: boolean; vehicleId?: string; vehicleLabel?: string };
  /** Our own lorries and vans, with who drives each now (drivers only). */
  vehicles: VehicleOption[];
}) {
  const id = useId();
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(person.name);
  const [mobile, setMobile] = useState(person.mobile);
  const [designation, setDesignation] = useState(person.designation);
  const [vehicleId, setVehicleId] = useState(person.vehicleId ?? "");
  const [problem, setProblem] = useState<string>();
  const [pending, startTransition] = useTransition();

  const missing =
    name.trim().length < 2 ? "Enter the name." : mobile.length !== 10 ? "Enter the 10-digit mobile number." : designation.trim().length < 2 ? "Enter the designation." : undefined;

  function reset() {
    setName(person.name);
    setMobile(person.mobile);
    setDesignation(person.designation);
    setVehicleId(person.vehicleId ?? "");
    setProblem(undefined);
  }

  function save() {
    if (missing || pending) return;
    startTransition(async () => {
      const result = await updateStaff(person.id, { name, mobile, designation, vehicleId: person.isDriver ? vehicleId : undefined });
      if (!result.ok) {
        setProblem(result.problem);
        return;
      }
      toast(`${name.trim()} updated.`);
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <SectionCard
        title="Details"
        action={
          <Button variant="secondary" onClick={() => (reset(), setEditing(true))} className="gap-1.5">
            <Pencil size={16} strokeWidth={1.9} aria-hidden />
            Edit
          </Button>
        }
      >
        <dl className="space-y-2 text-[15px]">
          <Row label="Name" value={person.name} />
          <Row label="Mobile" value={person.mobile ? `+91 ${person.mobile}` : "Not set"} warn={person.mobile.length !== 10} />
          <Row label="Designation" value={person.designation} />
          {person.isDriver && <Row label="Vehicle" value={person.vehicleLabel ?? "Not assigned"} warn={!person.vehicleLabel} />}
        </dl>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Edit details">
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="Name" htmlFor={`${id}-name`}>
          <input id={`${id}-name`} className={inputClass} maxLength={60} value={name} onChange={(e) => (setName(e.target.value), setProblem(undefined))} autoFocus />
        </Field>
        <Field label="Mobile number" htmlFor={`${id}-mobile`} hint="Also what they sign in with">
          <AffixInput
            id={`${id}-mobile`}
            prefix="+91"
            inputMode="numeric"
            autoComplete="off"
            value={mobile}
            onChange={(e) => (setMobile(e.target.value.replace(/\D/g, "").slice(0, 10)), setProblem(undefined))}
          />
        </Field>
        <Field label="Designation" htmlFor={`${id}-designation`}>
          <input id={`${id}-designation`} className={inputClass} maxLength={40} value={designation} onChange={(e) => (setDesignation(e.target.value), setProblem(undefined))} />
        </Field>
        {person.isDriver && (
          <Field label="Vehicle" htmlFor={`${id}-vehicle`} hint="Sales fill in this driver when this vehicle is chosen">
            <Select
              id={`${id}-vehicle`}
              label="Vehicle"
              placeholder="Not assigned"
              value={vehicleId}
              onChange={(next) => (setVehicleId(next), setProblem(undefined))}
              options={[{ value: "", label: "Not assigned" }, ...vehicles.map((v) => ({ value: v.id, label: v.label, hint: v.hint }))]}
            />
          </Field>
        )}
        {(problem || missing) && <p className="text-[13px] text-danger sm:col-span-2">{problem ?? missing}</p>}
        <div className="flex items-center gap-4 sm:col-span-2">
          <Button type="submit" disabled={Boolean(missing) || pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button variant="plain" disabled={pending} onClick={() => (reset(), setEditing(false))}>
            Cancel
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-secondary">{label}</dt>
      <dd className={warn ? "text-warning" : "text-ink"}>{value}</dd>
    </div>
  );
}
