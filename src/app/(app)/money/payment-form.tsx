"use client";

import { Camera } from "lucide-react";
import { useId, useState } from "react";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { SubmitBar } from "@/components/ui/submit-bar";
import { sampleSaveMessage, useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/cn";
import type { PaymentMode } from "@/lib/data/types";
import { formatBalance, formatINR } from "@/lib/format";

type PartyOption = { id: string; name: string; place?: string; balance: number };

/**
 * Receipt (money in from a customer) or payment (money out to a company or lorry owner).
 * Same layout for both; the receipt also records who collected it and the paper memo number.
 */
export function PaymentForm({
  kind,
  parties,
  staff,
  today,
}: {
  kind: "receipt" | "payment";
  parties: PartyOption[];
  staff: { id: string; name: string }[];
  today: string;
}) {
  const id = useId();
  const toast = useToast();
  const [partyId, setPartyId] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<PaymentMode>("cash");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(today);
  const [collectedBy, setCollectedBy] = useState("");
  const [memo, setMemo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  const party = parties.find((p) => p.id === partyId);
  const value = parseFloat(amount) || 0;
  // A receipt reduces what the customer owes (Dr); a payment reduces what we owe the company (Cr).
  const after = party ? party.balance + (kind === "receipt" ? -value : value) : 0;
  const isReceipt = kind === "receipt";
  const missing = !party
    ? `Choose the party ${isReceipt ? "who paid" : "being paid"}.`
    : value <= 0
      ? "Enter the amount."
      : mode !== "cash" && !reference.trim()
        ? `Enter the ${mode === "cheque" ? "cheque number" : "UTR / reference"}.`
        : null;
  const save = () => !missing && toast(sampleSaveMessage(kind));

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <section className="surface space-y-4 p-5">
        <Field label={isReceipt ? "Received from" : "Paid to"} htmlFor={`${id}-party`}>
          <Select
            id={`${id}-party`}
            label={isReceipt ? "Received from" : "Paid to"}
            placeholder="Choose a party"
            value={partyId}
            onChange={setPartyId}
            options={parties.map((p) => ({ value: p.id, label: p.name, hint: p.place }))}
          />
        </Field>
        {party && (
          <div className="flex justify-between rounded-2xl border border-hairline bg-card-subtle px-4 py-3 text-[13px]">
            <span className="text-ink-secondary">
              Balance now <span className="font-medium text-ink">{formatBalance(party.balance)}</span>
            </span>
            {value > 0 && (
              <span className="text-ink-secondary">
                After this <span className="font-medium text-ink">{formatBalance(after)}</span>
              </span>
            )}
          </div>
        )}
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
        <Segmented
          label="Payment mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "cash", label: "Cash" },
            { value: "upi", label: "UPI" },
            { value: "cheque", label: "Cheque" },
            // Receipts can come by NEFT; payments are made by cash, UPI or cheque only.
            ...(isReceipt ? [{ value: "neft" as const, label: "NEFT" }] : []),
          ]}
        />
        {mode !== "cash" && (
          <Field label={mode === "cheque" ? "Cheque number" : "UTR / reference"} htmlFor={`${id}-ref`}>
            <input id={`${id}-ref`} className={inputClass} value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" htmlFor={`${id}-date`}>
            <DatePicker id={`${id}-date`} label="Date" value={date} onChange={setDate} />
          </Field>
          {isReceipt && (
            <Field label="Collected by" htmlFor={`${id}-by`}>
              <Select
                id={`${id}-by`}
                label="Collected by"
                value={collectedBy}
                onChange={setCollectedBy}
                options={[{ value: "", label: "At the office" }, ...staff.map((s) => ({ value: s.id, label: s.name }))]}
              />
            </Field>
          )}
        </div>
      </section>

      <section className="surface space-y-4 p-5">
        {isReceipt && (
          <Field label="Paper memo number" htmlFor={`${id}-memo`}>
            <input id={`${id}-memo`} className={inputClass} value={memo} onChange={(e) => setMemo(e.target.value)} />
          </Field>
        )}
        <Field label="Remarks" htmlFor={`${id}-remarks`}>
          <textarea id={`${id}-remarks`} rows={2} className={cn(inputClass, "h-auto py-3")} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </Field>
        <label
          htmlFor={`${id}-photo`}
          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-divider px-4 py-3 text-[15px] text-ink-secondary hover:bg-card-subtle"
        >
          <Camera size={20} strokeWidth={1.75} className="text-accent" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{photo ?? `Add a photo of the ${mode === "cheque" ? "cheque" : "slip"} (optional)`}</span>
          <input
            id={`${id}-photo`}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => setPhoto(e.target.files?.[0]?.name ?? null)}
          />
        </label>
      </section>

      <SubmitBar
        label={isReceipt ? "Save receipt" : "Save payment"}
        disabled={Boolean(missing)}
        hint={missing}
        summary={{ label: "Amount", value: formatINR(value) }}
        onSubmit={save}
      />
    </form>
  );
}
