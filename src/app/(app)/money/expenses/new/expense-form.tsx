"use client";

import { Camera } from "lucide-react";
import { useId, useState } from "react";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { SubmitBar } from "@/components/ui/submit-bar";
import { sampleSaveMessage, useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import type { ExpenseHead } from "@/lib/data/types";
import { formatINR } from "@/lib/format";
import { expenseHeadLabels } from "@/lib/labels";

type TagKind = "none" | "vehicle" | "employee" | "godown";

/** Expense with a fixed head (no free typing), who paid it, and what it was for. */
export function ExpenseForm({
  today,
  paidFrom,
  tags,
}: {
  today: string;
  paidFrom: { value: string; label: string }[];
  tags: Record<Exclude<TagKind, "none">, string[]>;
}) {
  const id = useId();
  const toast = useToast();
  const [head, setHead] = useState<ExpenseHead | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [from, setFrom] = useState(paidFrom[0]?.value ?? "");
  const [tagKind, setTagKind] = useState<TagKind>("none");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  const value = parseFloat(amount) || 0;
  const missing = !head ? "Choose the expense head." : value <= 0 ? "Enter the amount." : !description.trim() ? "Say what it was for." : null;
  const save = () => !missing && toast(sampleSaveMessage("expense"));

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <section className="surface p-5">
        <p className="mb-3 text-[13px] text-ink-secondary">Expense head</p>
        <div role="radiogroup" aria-label="Expense head" className="grid grid-cols-3 gap-2">
          {(Object.keys(expenseHeadLabels) as ExpenseHead[]).map((h) => (
            <button
              key={h}
              type="button"
              role="radio"
              aria-checked={head === h}
              onClick={() => setHead(h)}
              className={cn(
                "min-h-11 rounded-2xl px-2 py-2 text-[14px] leading-tight transition-colors",
                head === h ? "bg-good-soft font-medium text-good" : "border border-hairline bg-card text-ink-secondary hover:text-ink",
              )}
            >
              {expenseHeadLabels[h]}
            </button>
          ))}
        </div>
      </section>

      <section className="surface space-y-4 p-5">
        <Field label="Amount" htmlFor={`${id}-amount`}>
          <AffixInput
            id={`${id}-amount`}
            prefix="₹"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-16 text-[28px] font-semibold tracking-[-0.4px]"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Paid from" htmlFor={`${id}-from`}>
            <Select id={`${id}-from`} label="Paid from" value={from} onChange={setFrom} options={paidFrom} />
          </Field>
          <Field label="Date" htmlFor={`${id}-date`}>
            <input id={`${id}-date`} type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="What was it for" htmlFor={`${id}-desc`}>
          <input id={`${id}-desc`} className={inputClass} placeholder="e.g. Diesel, Polaki to Tekkali" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </section>

      <section className="surface space-y-4 p-5">
        <p className="text-[13px] text-ink-secondary">Charge it to (for vehicle, staff and godown cost reports)</p>
        <Segmented
          label="Charge to"
          value={tagKind}
          onChange={(k) => {
            setTagKind(k);
            setTag(k === "none" ? "" : tags[k][0] ?? "");
          }}
          options={[
            { value: "none", label: "Nothing" },
            { value: "vehicle", label: "Vehicle" },
            { value: "employee", label: "Staff" },
            { value: "godown", label: "Godown" },
          ]}
        />
        {tagKind !== "none" && (
          <Select aria-label="Which one" value={tag} onChange={setTag} options={tags[tagKind].map((t) => ({ value: t, label: t }))} />
        )}
        <label
          htmlFor={`${id}-photo`}
          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-divider px-4 py-3 text-[15px] text-ink-secondary hover:bg-card-subtle"
        >
          <Camera size={20} strokeWidth={1.75} className="text-accent" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{photo ?? "Add a photo of the bill (optional)"}</span>
          <input id={`${id}-photo`} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0]?.name ?? null)} />
        </label>
      </section>

      <SubmitBar label="Save expense" disabled={Boolean(missing)} hint={missing} summary={{ label: "Amount", value: formatINR(value) }} onSubmit={save} />
    </form>
  );
}
