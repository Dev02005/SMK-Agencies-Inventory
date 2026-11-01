"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { sampleSaveMessage, useToast } from "@/components/ui/toast";
import { Select, type SelectOption } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/cn";

export type SimpleField = {
  name: string;
  label: string;
  type?: "text" | "number" | "select" | "date" | "textarea";
  options?: SelectOption[];
  prefix?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  hint?: string;
  /** Grid columns this field spans on wider screens (1 or 2). */
  wide?: boolean;
};

/** Small master-data form (godown, product, user, firm). Settings screens pass the fields as plain data. */
export function SimpleForm({ fields, submitLabel, thing }: { fields: SimpleField[]; submitLabel: string; thing: string }) {
  const id = useId();
  const toast = useToast();
  const initial = Object.fromEntries(fields.map((f) => [f.name, f.defaultValue ?? (f.type === "select" ? (f.options?.[0]?.value ?? "") : "")]));
  const [values, setValues] = useState<Record<string, string>>(initial);
  const missing = fields.find((f) => f.required && !values[f.name]?.trim());

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (missing) return;
        toast(sampleSaveMessage(thing));
      }}
    >
      {fields.map((f) => {
        const fieldId = `${id}-${f.name}`;
        const set = (v: string) => setValues((cur) => ({ ...cur, [f.name]: v }));
        return (
          <Field key={f.name} label={f.label} htmlFor={fieldId} hint={f.hint} className={cn(f.wide && "sm:col-span-2")}>
            {f.type === "select" ? (
              <Select id={fieldId} label={f.label} value={values[f.name]} onChange={set} options={f.options ?? []} />
            ) : f.type === "textarea" ? (
              <textarea
                id={fieldId}
                rows={3}
                className={cn(inputClass, "h-auto py-3")}
                placeholder={f.placeholder}
                value={values[f.name]}
                onChange={(e) => set(e.target.value)}
              />
            ) : f.type === "date" ? (
              <DatePicker id={fieldId} label={f.label} value={values[f.name]} onChange={set} clearable={!f.required} />
            ) : f.prefix ? (
              <AffixInput
                id={fieldId}
                prefix={f.prefix}
                inputMode={f.type === "number" ? "decimal" : undefined}
                placeholder={f.placeholder}
                value={values[f.name]}
                onChange={(e) => set(e.target.value)}
                className={f.prefix.length > 1 ? "pl-14" : undefined}
              />
            ) : (
              <input
                id={fieldId}
                className={inputClass}
                inputMode={f.type === "number" ? "decimal" : undefined}
                placeholder={f.placeholder}
                value={values[f.name]}
                onChange={(e) => set(e.target.value)}
              />
            )}
          </Field>
        );
      })}
      <div className="flex items-center justify-end gap-4 sm:col-span-2">
        {missing && <p className="text-[13px] text-ink-secondary">Enter the {missing.label.toLowerCase()}.</p>}
        <Button type="submit" disabled={Boolean(missing)}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
