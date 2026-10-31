"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { addBankAccount, type LocalBankAccount } from "@/lib/bank-book";
import { todayISO } from "@/lib/format";
import { BANK_NAMES, bankFromIfsc } from "@/lib/statement-parser";

const OTHER = "Other bank";
const typeLabels: Record<LocalBankAccount["type"], string> = { current: "current", savings: "savings", od: "OD / CC" };
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** A new bank account. The IFSC fills in the bank's name; the account name defaults to "<bank> current". */
export function AddBankForm({ holder }: { holder: string }) {
  const id = useId();
  const router = useRouter();
  const toast = useToast();
  const [bank, setBank] = useState("");
  const [otherBank, setOtherBank] = useState("");
  const [type, setType] = useState<LocalBankAccount["type"]>("current");
  const [name, setName] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [branch, setBranch] = useState("");
  const [accountHolder, setAccountHolder] = useState(holder);
  const [opening, setOpening] = useState("");
  const [openingDate, setOpeningDate] = useState(todayISO());

  const bankName = bank === OTHER ? otherBank.trim() : bank;
  const defaultName = bankName ? `${bankName.replace(/ (Bank|of India)$/i, "")} ${typeLabels[type]}` : "";
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
    if (missing) return;
    try {
      const saved = addBankAccount({
        bank: bankName,
        name: name.trim() || defaultName,
        accountNo: digits,
        ifsc: ifsc || undefined,
        branch: branch.trim() || undefined,
        holder: accountHolder.trim() || undefined,
        type,
        openingBalance: Number(opening) || 0,
        openingDate,
      });
      toast(`${saved.name} added. Saved on this device until the database is connected.`);
      router.push(`/money/banks/${saved.id}`);
    } catch (error) {
      toast((error as Error).message);
    }
  }

  return (
    <form
      className="surface space-y-4 p-5 md:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="IFSC" htmlFor={`${id}-ifsc`} hint="Fills in the bank for you">
          <input id={`${id}-ifsc`} className={inputClass} placeholder="SBIN0001234" maxLength={11} autoCapitalize="characters" value={ifsc} onChange={(e) => chooseIfsc(e.target.value)} />
        </Field>
        <Field label="Bank" htmlFor={`${id}-bank`}>
          <Select id={`${id}-bank`} label="Bank" placeholder="Choose the bank" value={bank} onChange={setBank} options={[...BANK_NAMES, OTHER].map((b) => ({ value: b, label: b }))} />
        </Field>
        {bank === OTHER && (
          <Field label="Bank name" htmlFor={`${id}-other`} className="sm:col-span-2">
            <input id={`${id}-other`} className={inputClass} value={otherBank} onChange={(e) => setOtherBank(e.target.value)} />
          </Field>
        )}
        <Field label="Account number" htmlFor={`${id}-no`}>
          <input id={`${id}-no`} className={inputClass} inputMode="numeric" autoComplete="off" value={accountNo} onChange={(e) => setAccountNo(e.target.value.replace(/[^\d\s]/g, ""))} />
        </Field>
        <Field label="Branch" htmlFor={`${id}-branch`}>
          <input id={`${id}-branch`} className={inputClass} placeholder="Polaki" value={branch} onChange={(e) => setBranch(e.target.value)} />
        </Field>
      </div>

      <div>
        <p className="mb-1.5 text-[13px] text-ink-secondary" aria-hidden>
          Account type
        </p>
        <Segmented
          label="Account type"
          value={type}
          onChange={setType}
          options={[
            { value: "current", label: "Current" },
            { value: "savings", label: "Savings" },
            { value: "od", label: "OD / CC" },
          ]}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name in the app" htmlFor={`${id}-name`} hint="What staff see in lists">
          <input id={`${id}-name`} className={inputClass} placeholder={defaultName || "SBI current"} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Account holder" htmlFor={`${id}-holder`}>
          <input id={`${id}-holder`} className={inputClass} value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} />
        </Field>
        <Field label="Opening balance" htmlFor={`${id}-opening`} hint={type === "od" ? "Use a minus sign for money drawn (e.g. −64,85,460)" : "Leave empty for a new account"}>
          <AffixInput id={`${id}-opening`} prefix="₹" inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value.replace(/[^\d.-]/g, ""))} />
        </Field>
        <Field label="Balance as on" htmlFor={`${id}-date`}>
          <input id={`${id}-date`} type="date" className={inputClass} value={openingDate} onChange={(e) => setOpeningDate(e.target.value)} />
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-hairline pt-4">
        {missing && <p className="mr-auto text-[13px] text-ink-secondary">{missing}</p>}
        <Button type="submit" disabled={Boolean(missing)}>
          Add bank
        </Button>
      </div>
    </form>
  );
}
