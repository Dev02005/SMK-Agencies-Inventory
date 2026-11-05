"use client";

import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { createDestination, createRentDriver } from "./actions";

type AddResult = { ok: true; name: string; added: boolean } | { ok: false; problem: string };

/**
 * A saved list to pick from, with "Add …" for a new name (saved for everyone at once). The current value shows even
 * when it isn't in the list (a party's own place, say).
 */
function PickOrAddField({
  label,
  placeholder,
  value,
  onChange,
  items,
  addLabel,
  newLabel,
  newPlaceholder,
  onAdd,
  addedMessage,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  items: string[];
  addLabel: string;
  newLabel: string;
  newPlaceholder: string;
  onAdd: (name: string) => Promise<AddResult>;
  addedMessage: (name: string, added: boolean) => string;
}) {
  const id = useId();
  const toast = useToast();
  const [list, setList] = useState(items);
  // What was typed in the search when Add was picked; null while that box is closed.
  const [adding, setAdding] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const options = [...new Set([...list, value].filter(Boolean))].sort((a, b) => a.localeCompare(b)).map((d) => ({ value: d, label: d }));

  function add() {
    const name = adding?.trim() ?? "";
    if (!name || pending) return;
    startTransition(async () => {
      const result = await onAdd(name);
      if (!result.ok) {
        toast(result.problem);
        return;
      }
      if (!list.includes(result.name)) setList((current) => [...current, result.name]);
      onChange(result.name);
      setAdding(null);
      toast(addedMessage(result.name, result.added));
    });
  }

  return (
    <div className="space-y-2">
      <Field label={label} htmlFor={`${id}-pick`}>
        <Select
          id={`${id}-pick`}
          label={label}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          options={options}
          searchable
          action={{ label: addLabel, onPick: (typed) => setAdding(typed) }}
        />
      </Field>
      {adding !== null && (
        <div className="flex items-end gap-2 rounded-2xl bg-card-subtle p-3">
          <Field label={newLabel} htmlFor={`${id}-new`} className="min-w-0 flex-1">
            <input
              id={`${id}-new`}
              className={inputClass}
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              maxLength={40}
              autoCapitalize="words"
              autoFocus
              placeholder={newPlaceholder}
            />
          </Field>
          <Button variant="plain" onClick={() => setAdding(null)}>
            Cancel
          </Button>
          <Button disabled={!adding.trim() || pending} onClick={add}>
            {pending ? "Adding…" : "Add"}
          </Button>
        </div>
      )}
    </div>
  );
}

/** Where the bill is delivered: the saved villages and towns, with "Add destination" for a new one. */
export function DestinationField({
  value,
  onChange,
  destinations,
  label = "Destination",
}: {
  value: string;
  onChange: (value: string) => void;
  destinations: string[];
  label?: string;
}) {
  return (
    <PickOrAddField
      label={label}
      placeholder="Choose a village or town"
      value={value}
      onChange={onChange}
      items={destinations}
      addLabel="Add destination"
      newLabel="New destination"
      newPlaceholder="Village or town"
      onAdd={createDestination}
      addedMessage={(name, added) => (added ? `${name} added to destinations` : `${name} is already in the list`)}
    />
  );
}

/** The driver of a rented vehicle: the saved rent drivers, with "Add driver" for a new one. */
export function RentDriverField({ value, onChange, drivers }: { value: string; onChange: (value: string) => void; drivers: string[] }) {
  return (
    <PickOrAddField
      label="Driver"
      placeholder="Choose the rent driver"
      value={value}
      onChange={onChange}
      items={drivers}
      addLabel="Add driver"
      newLabel="New rent driver"
      newPlaceholder="Driver's name"
      onAdd={createRentDriver}
      addedMessage={(name, added) => (added ? `${name} added to rent drivers` : `${name} is already in the list`)}
    />
  );
}
