"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { SectionCard } from "@/components/ui/blocks";
import { Button } from "@/components/ui/button";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { updateVehicle, type VehicleInput } from "./actions";

type Group = VehicleInput["group"];
type Kind = VehicleInput["kind"];

const kindsFor: Record<Group, { value: Kind; label: string }[]> = {
  commercial: [
    { value: "lorry", label: "Lorry" },
    { value: "van", label: "Van / pickup" },
  ],
  rented: [
    { value: "van", label: "Van / pickup" },
    { value: "lorry", label: "Lorry" },
  ],
  personal: [
    { value: "car", label: "Car" },
    { value: "bike", label: "Bike" },
  ],
};

/**
 * The owner's card on a vehicle's page: its number, whether it is commercial, rented or personal, its type and
 * model, and its driver (one of our drivers for a commercial vehicle; the rented vehicle's own driver otherwise).
 */
export function VehicleEditor({
  vehicle,
  drivers,
}: {
  vehicle: { id: string; number: string; group: Group; kind: Kind; model: string; driverId?: string; driverName?: string; driverMobile?: string };
  /** Our drivers, with the vehicle each drives now. */
  drivers: { id: string; name: string; hint?: string }[];
}) {
  const id = useId();
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [number, setNumber] = useState(vehicle.number);
  const [group, setGroup] = useState<Group>(vehicle.group);
  const [kind, setKind] = useState<Kind>(vehicle.kind);
  const [model, setModel] = useState(vehicle.model);
  const [driver, setDriver] = useState(vehicle.driverId ?? "");
  const [driverName, setDriverName] = useState(vehicle.driverName ?? "");
  const [driverMobile, setDriverMobile] = useState(vehicle.driverMobile ?? "");
  const [problem, setProblem] = useState<string>();
  const [pending, startTransition] = useTransition();

  const groupLabel = { commercial: "Commercial", rented: "Rented", personal: "Personal" }[vehicle.group];
  const kindLabel = kindsFor[vehicle.group].find((k) => k.value === vehicle.kind)?.label ?? vehicle.kind;

  function save() {
    if (pending || number.trim().length < 4) return;
    startTransition(async () => {
      const result = await updateVehicle(vehicle.id, { number, group, kind, model, driver, driverName, driverMobile });
      if (!result.ok) {
        setProblem(result.problem);
        return;
      }
      toast("Vehicle updated.");
      setEditing(false);
      if (result.id !== vehicle.id) router.replace(`/fleet/${result.id}`);
      else router.refresh();
    });
  }

  if (!editing) {
    return (
      <SectionCard
        title="Details"
        action={
          <Button variant="secondary" onClick={() => setEditing(true)} className="gap-1.5">
            <Pencil size={16} strokeWidth={1.9} aria-hidden />
            Edit
          </Button>
        }
      >
        <dl className="space-y-2 text-[15px]">
          <Row label="Number" value={vehicle.number} />
          <Row label="Type" value={`${groupLabel} · ${kindLabel}`} />
          <Row label="Model" value={vehicle.model || "Not added"} />
          {vehicle.group !== "personal" && (
            <Row
              label="Driver"
              value={vehicle.driverName ? [vehicle.driverName, vehicle.driverMobile && `+91 ${vehicle.driverMobile}`].filter(Boolean).join(" · ") : "Not assigned"}
            />
          )}
        </dl>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Edit vehicle">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Segmented
          label="Commercial, rented or personal"
          value={group}
          onChange={(next) => {
            setGroup(next);
            if (!kindsFor[next].some((k) => k.value === kind)) setKind(kindsFor[next][0].value);
            setProblem(undefined);
          }}
          options={[
            { value: "commercial", label: "Commercial" },
            { value: "rented", label: "Rented" },
            { value: "personal", label: "Personal" },
          ]}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vehicle number" htmlFor={`${id}-number`}>
            <input
              id={`${id}-number`}
              className={inputClass}
              maxLength={16}
              autoCapitalize="characters"
              value={number}
              onChange={(e) => (setNumber(e.target.value.toUpperCase()), setProblem(undefined))}
            />
          </Field>
          <Field label="Type" htmlFor={`${id}-kind`}>
            <Select id={`${id}-kind`} label="Type" value={kind} onChange={(next) => setKind(next as Kind)} options={kindsFor[group]} />
          </Field>
          <Field label="Model" htmlFor={`${id}-model`} hint="Like Eicher or Mahindra Bolero">
            <input id={`${id}-model`} className={inputClass} maxLength={60} value={model} onChange={(e) => setModel(e.target.value)} />
          </Field>
          {group === "commercial" && (
            <Field label="Driver" htmlFor={`${id}-driver`} hint="Sales fill in this driver when this vehicle is chosen">
              <Select
                id={`${id}-driver`}
                label="Driver"
                placeholder="Not assigned"
                value={driver}
                onChange={setDriver}
                options={[{ value: "", label: "Not assigned" }, ...drivers.map((d) => ({ value: d.id, label: d.name, hint: d.hint }))]}
              />
            </Field>
          )}
          {group === "rented" && (
            <>
              <Field label="Driver's name" htmlFor={`${id}-dname`}>
                <input id={`${id}-dname`} className={inputClass} maxLength={40} value={driverName} onChange={(e) => setDriverName(e.target.value)} />
              </Field>
              <Field label="Driver's mobile" htmlFor={`${id}-dmobile`}>
                <AffixInput
                  id={`${id}-dmobile`}
                  prefix="+91"
                  inputMode="numeric"
                  autoComplete="off"
                  value={driverMobile}
                  onChange={(e) => setDriverMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                />
              </Field>
            </>
          )}
        </div>
        {problem && <p className="text-[13px] text-danger">{problem}</p>}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={pending || number.trim().length < 4}>
            {pending ? "Saving…" : "Save vehicle"}
          </Button>
          <Button
            variant="plain"
            disabled={pending}
            onClick={() => {
              setNumber(vehicle.number);
              setGroup(vehicle.group);
              setKind(vehicle.kind);
              setModel(vehicle.model);
              setDriver(vehicle.driverId ?? "");
              setDriverName(vehicle.driverName ?? "");
              setDriverMobile(vehicle.driverMobile ?? "");
              setProblem(undefined);
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-secondary">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  );
}
