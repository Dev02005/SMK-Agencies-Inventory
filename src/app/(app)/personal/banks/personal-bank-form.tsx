"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { BANK_NAMES, bankFromIfsc } from "@/lib/statement-parser";
import { addPersonalBank } from "./actions";

const OTHER = "Other bank";
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** Personal › Banks › Add bank: like Money › Add bank, but saved as one of the owner's own accounts. */
export function PersonalBankForm() {
  const id = useId();
  const router = useRouter();
  const toast = useToast();
  const [bank, setBank] = useState("");
  const [otherBank, setOtherBank] = useState("");
  const [name, setName] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [branch, setBranch] = useState("");
  const [opening, setOpening] = useState("");
  const [problem, setProblem] = useState<string>();
  const [pending, startTransition] = useTransition();

  const bankName = bank === OTHER ? otherBank.trim() : bank;
  const defaultName = bankName ? `${bankName.replace(/ (Bank|of India)$/i, "")} savings` : "";
  const digits = accountNo.replace(/\s/g, "");
  const missing = !bankName
    ? "Choose the bank."
    : !/^\d{6,20}$/.test(digits)
      ? "Enter the account number (6 to 20 digits)."
      : ifsc && !IFSC.test(ifsc)
        ? "The IFSC should look like SBIN0001234 (11 characters)."
        : opening && Number.isNaN(Number(opening))
          ? "Enter the opening balance as a number."
          : null;

  function chooseIfsc(value: string) {
    const code = value.toUpperCase().replace(/\s/g, "");
    setIfsc(code);
    const detected = IFSC.test(code) ? bankFromIfsc(code) : undefined;
    if (detected && !bank) setBank(detected);
  }

  function save() {
    if (missing || pending) return;
    startTransition(async () => {
      const result = await addPersonalBank({ bank: bankName, name: name || defaultName, accountNo: digits, ifsc, branch, openingBalance: Number(opening) || 0 });
      if (!result.ok) {
        setProblem(result.problem);
        return;
      }
      toast(`${result.name} added.`);
      setBank("");
      setOtherBank("");
      setName("");
      setAccountNo("");
      setIfsc("");
      setBranch("");
      setOpening("");
      router.refresh();
    });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="IFSC" htmlFor={`${id}-ifsc`} hint="Fills in the bank for you">
          <input id={`${id}-ifsc`} className={inputClass} placeholder="SBIN0001234" maxLength={11} autoCapitalize="characters" value={ifsc} onChange={(e) => (chooseIfsc(e.target.value), setProblem(undefined))} />
        </Field>
        <Field label="Bank" htmlFor={`${id}-bank`}>
          <Select id={`${id}-bank`} label="Bank" placeholder="Choose the bank" value={bank} onChange={(v) => (setBank(v), setProblem(undefined))} options={[...BANK_NAMES, OTHER].map((b) => ({ value: b, label: b }))} />
        </Field>
        {bank === OTHER && (
          <Field label="Bank name" htmlFor={`${id}-other`}>
            <input id={`${id}-other`} className={inputClass} maxLength={60} value={otherBank} onChange={(e) => setOtherBank(e.target.value)} />
          </Field>
        )}
        <Field label="Account number" htmlFor={`${id}-no`}>
          <input id={`${id}-no`} className={inputClass} inputMode="numeric" autoComplete="off" maxLength={24} value={accountNo} onChange={(e) => (setAccountNo(e.target.value.replace(/[^\d\s]/g, "")), setProblem(undefined))} />
        </Field>
        <Field label="Account name" htmlFor={`${id}-name`} hint={defaultName ? `Leave empty for "${defaultName}"` : "How it shows in the list"}>
          <input id={`${id}-name`} className={inputClass} maxLength={60} placeholder={defaultName} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Branch" htmlFor={`${id}-branch`} hint="Optional">
          <input id={`${id}-branch`} className={inputClass} maxLength={60} value={branch} onChange={(e) => setBranch(e.target.value)} />
        </Field>
        <Field label="Balance today" htmlFor={`${id}-opening`} hint="The balance to start from">
          <AffixInput id={`${id}-opening`} prefix="₹" inputMode="decimal" placeholder="0" value={opening} onChange={(e) => setOpening(e.target.value)} />
        </Field>
      </div>
      {(problem || (missing && (bank || accountNo))) && <p className="text-[13px] text-danger">{problem ?? missing}</p>}
      <Button type="submit" disabled={Boolean(missing) || pending}>
        {pending ? "Adding…" : "Add bank"}
      </Button>
    </form>
  );
}
