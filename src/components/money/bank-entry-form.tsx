"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { addBankEntries, useBankBook } from "@/lib/bank-book";
import { todayISO } from "@/lib/format";

const kinds = {
  in: ["Cash deposit", "Transfer in", "Interest received", "Other money in"],
  out: ["Cash withdrawal", "Transfer out", "Bank charges", "Drawings to owner", "Other money out"],
} as const;

/**
 * One bank entry for money that isn't a receipt, payment or expense: deposits, withdrawals, transfers, charges.
 * On a bank's own page the account is fixed; on the New bank entry page it is chosen (banks added here included).
 */
export function BankEntryForm({
  accounts,
  accountId: fixedAccount,
  defaultAccountId,
  onDone,
}: {
  accounts: { id: string; name: string }[];
  accountId?: string;
  defaultAccountId?: string;
  onDone?: () => void;
}) {
  const id = useId();
  const router = useRouter();
  const toast = useToast();
  const book = useBankBook();
  const choices = [...accounts, ...book.accounts.map((a) => ({ id: a.id, name: a.name }))];
  const [chosen, setChosen] = useState(defaultAccountId ?? "");
  const accountId = fixedAccount ?? (chosen || choices[0]?.id || "");
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [kind, setKind] = useState<string>(kinds.in[0]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [ref, setRef] = useState("");

  const value = Number(amount);
  const missing = !accountId ? "Choose the account." : !(value > 0) ? "Enter the amount." : !date ? "Enter the date." : null;

  function chooseDirection(next: "in" | "out") {
    setDirection(next);
    setKind(kinds[next][0]);
  }

  function save() {
    if (missing) return;
    try {
      addBankEntries([
        {
          accountId,
          date,
          amount: direction === "in" ? value : -value,
          description: note.trim() ? `${kind} · ${note.trim()}` : kind,
          ref: ref.trim() || undefined,
          source: "manual",
        },
      ]);
      const name = choices.find((a) => a.id === accountId)?.name ?? "the bank";
      toast(`Entry saved to ${name} on this device.`);
      if (onDone) onDone();
      else router.push(`/money/banks/${accountId}`);
    } catch (error) {
      toast((error as Error).message);
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      {!fixedAccount && (
        <Field label="Account" htmlFor={`${id}-account`}>
          <Select id={`${id}-account`} label="Account" value={accountId} onChange={setChosen} options={choices.map((a) => ({ value: a.id, label: a.name }))} />
        </Field>
      )}
      <Segmented
        label="Money in or out"
        value={direction}
        onChange={chooseDirection}
        options={[
          { value: "in", label: "Money in" },
          { value: "out", label: "Money out" },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" htmlFor={`${id}-kind`}>
          <Select id={`${id}-kind`} label="Type" value={kind} onChange={setKind} options={kinds[direction].map((k) => ({ value: k, label: k }))} />
        </Field>
        <Field label="Amount" htmlFor={`${id}-amount`}>
          <AffixInput id={`${id}-amount`} prefix="₹" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
        </Field>
        <Field label="Date" htmlFor={`${id}-date`}>
          <input id={`${id}-date`} type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Reference / UTR" htmlFor={`${id}-ref`}>
          <input id={`${id}-ref`} className={inputClass} placeholder="Optional" value={ref} onChange={(e) => setRef(e.target.value)} />
        </Field>
        <Field label="Note" htmlFor={`${id}-note`} className="sm:col-span-2">
          <input id={`${id}-note`} className={inputClass} placeholder="e.g. counter cash deposited by Ramana" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {missing && <p className="mr-auto text-[13px] text-ink-secondary">{missing}</p>}
        {onDone && (
          <Button variant="plain" className="px-3" onClick={onDone}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={Boolean(missing)}>
          Save entry
        </Button>
      </div>
    </form>
  );
}
