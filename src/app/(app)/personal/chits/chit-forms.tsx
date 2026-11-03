"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { formatINR } from "@/lib/format";
import { addChit, recordInstalment, recordLifted } from "../records-actions";

const num = (v: string) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);

/** The row above the chits: the data tag and Add chit, which opens the form below it. */
export function AddChit({ tag, today }: { tag: ReactNode; today: string }) {
  const id = useId();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [organiser, setOrganiser] = useState("");
  const [chitNo, setChitNo] = useState("");
  const [scope, setScope] = useState<"personal" | "business">("personal");
  const [value, setValue] = useState("");
  const [months, setMonths] = useState("");
  const [instalment, setInstalment] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [paidMonths, setPaidMonths] = useState("");
  const [paidBefore, setPaidBefore] = useState("");

  const monthCount = parseInt(months, 10) || 0;
  // Until it is typed, the instalment is the chit value spread evenly over the months.
  const evenInstalment = monthCount > 0 && num(value) > 0 ? Math.round(num(value) / monthCount) : 0;
  const instalmentValue = instalment.trim() ? num(instalment) : evenInstalment;
  const alreadyPaid = parseInt(paidMonths, 10) || 0;
  const missing = !organiser.trim()
    ? "Enter the chit company."
    : !(num(value) > 0)
      ? "Enter the chit value."
      : !(monthCount > 0)
        ? "Enter the months."
        : !(instalmentValue > 0)
          ? "Enter the monthly instalment."
          : alreadyPaid > monthCount
            ? "Instalments already paid can't be more than the months."
            : null;

  function save() {
    if (missing || pending) return;
    startTransition(async () => {
      const result = await addChit({
        organiser,
        chitNo,
        scope,
        totalValue: num(value),
        months: monthCount,
        instalment: instalmentValue,
        startDate,
        paidMonths: alreadyPaid,
        paidBefore: paidBefore.trim() ? num(paidBefore) : null,
      });
      if (!result.ok) {
        toast(result.problem);
        return;
      }
      toast(`${organiser.trim()} chit added`);
      setOpen(false);
      setOrganiser("");
      setChitNo("");
      setValue("");
      setMonths("");
      setInstalment("");
      setPaidMonths("");
      setPaidBefore("");
      router.refresh();
    });
  }

  return (
    <div className="mb-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>{tag}</div>
        {!open && (
          <Button onClick={() => setOpen(true)}>
            <Plus size={18} strokeWidth={2.25} aria-hidden /> Add chit
          </Button>
        )}
      </div>
      {open && (
        <form
          className="surface space-y-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <h2 className="text-[17px] font-semibold tracking-[-0.3px] text-ink">Add chit</h2>
          <Segmented
            label="Chit for"
            value={scope}
            onChange={setScope}
            options={[
              { value: "personal", label: "Personal" },
              { value: "business", label: "Business" },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Chit company" htmlFor={`${id}-org`}>
              <input id={`${id}-org`} className={inputClass} value={organiser} onChange={(e) => setOrganiser(e.target.value)} maxLength={60} autoCapitalize="words" autoFocus />
            </Field>
            <Field label="Chit no." htmlFor={`${id}-no`} hint="Optional">
              <input id={`${id}-no`} className={inputClass} value={chitNo} onChange={(e) => setChitNo(e.target.value)} maxLength={30} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Chit value" htmlFor={`${id}-value`}>
              <AffixInput id={`${id}-value`} prefix="₹" inputMode="decimal" placeholder="0" value={value} onChange={(e) => setValue(e.target.value)} />
            </Field>
            <Field label="Months" htmlFor={`${id}-months`}>
              <AffixInput id={`${id}-months`} inputMode="numeric" placeholder="0" suffix="months" value={months} onChange={(e) => setMonths(e.target.value.replace(/\D/g, "").slice(0, 3))} />
            </Field>
            <Field label="Monthly instalment" htmlFor={`${id}-inst`} hint={evenInstalment && !instalment.trim() ? "Value ÷ months; change it if it differs" : undefined}>
              <AffixInput
                id={`${id}-inst`}
                prefix="₹"
                inputMode="decimal"
                placeholder={evenInstalment ? String(evenInstalment) : "0"}
                value={instalment}
                onChange={(e) => setInstalment(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="First instalment on" htmlFor={`${id}-start`} hint={`Due on day ${Number(startDate.slice(8, 10))} of every month`}>
              <DatePicker id={`${id}-start`} label="First instalment on" value={startDate} onChange={setStartDate} />
            </Field>
            <Field label="Instalments already paid" htmlFor={`${id}-paid`} hint="If it started before you added it">
              <AffixInput id={`${id}-paid`} inputMode="numeric" placeholder="0" value={paidMonths} onChange={(e) => setPaidMonths(e.target.value.replace(/\D/g, "").slice(0, 3))} />
            </Field>
            {alreadyPaid > 0 && (
              <Field label="Paid on those so far" htmlFor={`${id}-before`} hint={`Leave empty for ${formatINR(alreadyPaid * instalmentValue)}`}>
                <AffixInput id={`${id}-before`} prefix="₹" inputMode="decimal" placeholder={String(alreadyPaid * instalmentValue)} value={paidBefore} onChange={(e) => setPaidBefore(e.target.value)} />
              </Field>
            )}
          </div>
          {missing && <p className="text-[13px] text-ink-secondary">{missing}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="plain" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={Boolean(missing) || pending}>
              {pending ? "Saving…" : "Save chit"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

/** The next instalment on a chit: the day paid and the amount (less than the full instalment once the dividend is off). */
export function RecordInstalment({ id, month, months, instalment, today }: { id: string; month: number; months: number; instalment: number; today: string }) {
  const fieldId = useId();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState(String(instalment));
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button variant="secondary" className="mt-4 w-full" onClick={() => setOpen(true)}>
        Record instalment
      </Button>
    );
  }
  return (
    <form
      className="mt-4 space-y-3 rounded-2xl bg-card-subtle p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!(num(amount) > 0) || pending) return;
        startTransition(async () => {
          const result = await recordInstalment(id, { date, amount: num(amount) });
          if (!result.ok) {
            toast(result.problem);
            return;
          }
          toast(`Instalment ${month} of ${months} recorded: ${formatINR(num(amount))}`);
          setOpen(false);
          router.refresh();
        });
      }}
    >
      <p className="text-[15px] font-semibold text-ink">
        Instalment {month} of {months}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Paid on" htmlFor={`${fieldId}-date`}>
          <DatePicker id={`${fieldId}-date`} label="Paid on" value={date} onChange={setDate} />
        </Field>
        <Field label="Amount paid" htmlFor={`${fieldId}-amount`} hint="Less than the full instalment when the dividend is taken off">
          <AffixInput id={`${fieldId}-amount`} prefix="₹" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="plain" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={!(num(amount) > 0) || pending}>
          {pending ? "Saving…" : "Save instalment"}
        </Button>
      </div>
    </form>
  );
}

/** The month the chit was lifted (taken in the auction or draw) and what was received. */
export function RecordLifted({ id, months, paidMonths, today }: { id: string; months: number; paidMonths: number; today: string }) {
  const fieldId = useId();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(String(Math.max(1, paidMonths)));
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [pending, startTransition] = useTransition();
  const monthNo = parseInt(month, 10) || 0;
  const ready = monthNo >= 1 && monthNo <= months && num(amount) > 0;

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 w-full text-center text-[14px] font-medium text-link hover:underline">
        Mark lifted
      </button>
    );
  }
  return (
    <form
      className="mt-3 space-y-3 rounded-2xl bg-card-subtle p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready || pending) return;
        startTransition(async () => {
          const result = await recordLifted(id, { month: monthNo, amount: num(amount), date });
          if (!result.ok) {
            toast(result.problem);
            return;
          }
          toast(`Lifted in month ${monthNo}: ${formatINR(num(amount))}`);
          setOpen(false);
          router.refresh();
        });
      }}
    >
      <p className="text-[15px] font-semibold text-ink">Chit lifted</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Month" htmlFor={`${fieldId}-month`}>
          <AffixInput id={`${fieldId}-month`} inputMode="numeric" value={month} onChange={(e) => setMonth(e.target.value.replace(/\D/g, "").slice(0, 3))} suffix={`of ${months}`} />
        </Field>
        <Field label="Amount received" htmlFor={`${fieldId}-amount`}>
          <AffixInput id={`${fieldId}-amount`} prefix="₹" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Lifted on" htmlFor={`${fieldId}-date`}>
          <DatePicker id={`${fieldId}-date`} label="Lifted on" value={date} onChange={setDate} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="plain" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={!ready || pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
