"use client";

import { useId, useState, useMemo } from "react";
import { filledLines, ItemLines, type ItemLine } from "@/components/forms/item-lines";
import { Field, inputClass } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { SubmitBar } from "@/components/ui/submit-bar";
import { sampleSaveMessage, useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/cn";
import type { Party, Product } from "@/lib/data/types";
import { partyOptions } from "@/lib/party-options";

export function OrderForm({
  parties,
  products,
  godowns,
  today,
}: {
  parties: Pick<Party, "id" | "name" | "place" | "kind">[];
  products: Product[];
  /** Where it can be loaded from; that godown's in-charges see the order. */
  godowns: { id: string; name: string; own?: boolean; productIds?: string[]; linkAllProducts?: boolean }[];
  today: string;
}) {
  const id = useId();
  const toast = useToast();
  const [partyId, setPartyId] = useState("");
  const [source, setSource] = useState<"staff" | "phone" | "sub_dealer">("phone");
  const [deliverBy, setDeliverBy] = useState(today);
  const [destination, setDestination] = useState("");
  const [godownId, setGodownId] = useState(godowns.length === 1 ? godowns[0].id : "");

  const selectedGodown = godowns.find((g) => g.id === godownId);
  const allowedProducts = useMemo(() => {
    if (!selectedGodown) return products;
    if (selectedGodown.linkAllProducts) return products;
    if (selectedGodown.productIds && selectedGodown.productIds.length > 0) {
      const set = new Set(selectedGodown.productIds);
      const matched = products.filter((p) => set.has(p.id));
      if (matched.length > 0) return matched;
    }
    if (selectedGodown.own) return products;
    const nameLower = selectedGodown.name.toLowerCase();
    const matched = products.filter((p) => nameLower.includes(p.brand.toLowerCase()));
    return matched.length > 0 ? matched : products;
  }, [selectedGodown, products]);

  // No item picked for you: "Add item" asks the category, brand and item.
  const [lines, setLines] = useState<ItemLine[]>([]);
  const [remarks, setRemarks] = useState("");

  const missing = !partyId
    ? "Choose the party."
    : !godownId
      ? "Choose the godown it is loaded from."
      : filledLines(lines).length === 0
        ? "Enter a quantity."
        : null;
  const save = () => !missing && toast(sampleSaveMessage("order"));

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <section className="surface space-y-4 p-5">
        <Field label="Party" htmlFor={`${id}-party`}>
          <Select
            id={`${id}-party`}
            label="Party"
            placeholder="Choose a party"
            value={partyId}
            onChange={(v) => {
              setPartyId(v);
              setDestination(parties.find((p) => p.id === v)?.place ?? "");
            }}
            options={partyOptions(parties)}
          />
        </Field>
        <Segmented
          label="Order came"
          value={source}
          onChange={setSource}
          options={[
            { value: "phone", label: "By phone" },
            { value: "staff", label: "Via staff" },
            { value: "sub_dealer", label: "Sub-dealer" },
          ]}
        />
        <Field label="Load from" htmlFor={`${id}-godown`} hint="Only this godown's in-charges see the order">
          <Select id={`${id}-godown`} label="Load from" placeholder="Choose a godown" value={godownId} onChange={setGodownId} options={godowns.map((g) => ({ value: g.id, label: g.name }))} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Deliver by" htmlFor={`${id}-by`}>
            <DatePicker id={`${id}-by`} label="Deliver by" value={deliverBy} onChange={setDeliverBy} clearable />
          </Field>
          <Field label="Deliver to" htmlFor={`${id}-to`}>
            <input id={`${id}-to`} className={inputClass} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Village or site" />
          </Field>
        </div>
      </section>

      <section className="surface p-5">
        <h2 className="text-[17px] font-semibold tracking-[-0.3px] text-ink">Items</h2>
        <ItemLines lines={lines} onChange={setLines} products={allowedProducts} withRate={false} />
      </section>

      <section className="surface p-5">
        <Field label="Remarks" htmlFor={`${id}-remarks`}>
          <textarea id={`${id}-remarks`} rows={3} className={cn(inputClass, "h-auto py-3")} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Deliver before 10 am" />
        </Field>
      </section>

      <SubmitBar label="Save order" disabled={Boolean(missing)} hint={missing} onSubmit={save} />
    </form>
  );
}
