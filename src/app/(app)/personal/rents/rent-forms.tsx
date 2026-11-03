"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { addDaysISO, formatINR, formatMonth, shiftMonth } from "@/lib/format";
import { addRent, recordRent } from "../records-actions";

const num = (v: string) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);

/** The row above the rents: the data tag and Add rent, which opens the form below it. */
export function AddRent({ tag, today }: { tag: ReactNode; today: string }) {
  const id = useId();
  const router = useRouter();
  const toast = useToast();
  const thisMonth = today.slice(0, 7);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [direction, setDirection] = useState<"received" | "paid">("received");
  const [scope, setScope] = useState<"personal" | "business">("personal");
  const [property, setProperty] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [phone, setPhone] = useState("");
  const [rent, setRent] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [advance, setAdvance] = useState("");
  const [agreementEnd, setAgreementEnd] = useState(addDaysISO(today, 365));
  // Paid up to last month, so this month's rent shows as due.
  const [paidThrough, setPaidThrough] = useState(shiftMonth(thisMonth, -1));

  const day = parseInt(dueDay, 10) || 0;
  const who = direction === "received" ? "Tenant" : "Owner";
  const missing = !property.trim()
    ? "Enter the property."
    : !counterparty.trim()
      ? `Enter the ${who.toLowerCase()}'s name.`
      : !(num(rent) > 0)
        ? "Enter the monthly rent."
        : !(day >= 1 && day <= 31)
          ? "Enter the day the rent is due."
          : phone && phone.length !== 10
            ? "Enter a 10-digit mobile number, or leave it empty."
            : null;

  function save() {
    if (missing || pending) return;
    startTransition(async () => {
      const result = await addRent({
        direction,
        property,
        counterparty,
        phone,
        monthlyRent: num(rent),
        dueDay: day,
        advance: num(advance),
        agreementEnd,
        paidThrough,
        scope,
      });
      if (!result.ok) {
        toast(result.problem);
        return;
      }
      toast(`${property.trim()} added`);
      setOpen(false);
      setProperty("");
      setCounterparty("");
      setPhone("");
      setRent("");
      setDueDay("");
      setAdvance("");
      router.refresh();
    });
  }

  return (
    <div className="mb-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>{tag}</div>
        {!open && (
          <Button onClick={() => setOpen(true)}>
            <Plus size={18} strokeWidth={2.25} aria-hidden /> Add rent
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
          <h2 className="text-[17px] font-semibold tracking-[-0.3px] text-ink">Add rent</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Segmented
              label="Rent received or paid"
              value={direction}
              onChange={setDirection}
              options={[
                { value: "received", label: "We receive rent" },
                { value: "paid", label: "We pay rent" },
              ]}
            />
            <Segmented
              label="For"
              value={scope}
              onChange={setScope}
              options={[
                { value: "personal", label: "Personal" },
                { value: "business", label: "Business" },
              ]}
            />
          </div>
          <Field label="Property" htmlFor={`${id}-property`}>
            <input id={`${id}-property`} className={inputClass} value={property} onChange={(e) => setProperty(e.target.value)} maxLength={80} placeholder="Shop, house or godown and where" autoFocus />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={who} htmlFor={`${id}-who`}>
              <input id={`${id}-who`} className={inputClass} value={counterparty} onChange={(e) => setCounterparty(e.target.value)} maxLength={60} autoCapitalize="words" />
            </Field>
            <Field label="Mobile" htmlFor={`${id}-phone`} hint="Optional">
              <input id={`${id}-phone`} className={inputClass} inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Monthly rent" htmlFor={`${id}-rent`}>
              <AffixInput id={`${id}-rent`} prefix="₹" inputMode="decimal" placeholder="0" value={rent} onChange={(e) => setRent(e.target.value)} />
            </Field>
            <Field label="Due on" htmlFor={`${id}-due`} hint="Day of every month">
              <AffixInput id={`${id}-due`} inputMode="numeric" placeholder="5" value={dueDay} onChange={(e) => setDueDay(e.target.value.replace(/\D/g, "").slice(0, 2))} />
            </Field>
            <Field label="Advance held" htmlFor={`${id}-advance`} hint="Optional">
              <AffixInput id={`${id}-advance`} prefix="₹" inputMode="decimal" placeholder="0" value={advance} onChange={(e) => setAdvance(e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rent paid up to" htmlFor={`${id}-through`} hint="The last month fully paid">
              <Select
                id={`${id}-through`}
                label="Rent paid up to"
                value={paidThrough}
                onChange={setPaidThrough}
                options={Array.from({ length: 13 }, (_, i) => shiftMonth(thisMonth, -i)).map((m) => ({ value: m, label: m === thisMonth ? `${formatMonth(m)} (this month)` : formatMonth(m) }))}
              />
            </Field>
            <Field label="Agreement ends" htmlFor={`${id}-end`}>
              <DatePicker id={`${id}-end`} label="Agreement ends" value={agreementEnd} onChange={setAgreementEnd} />
            </Field>
          </div>
          {missing && <p className="text-[13px] text-ink-secondary">{missing}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="plain" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={Boolean(missing) || pending}>
              {pending ? "Saving…" : "Save rent"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

/** One month's rent received (or paid): the month after the one it is paid up to, with the amount and the day. */
export function RecordRent({
  id,
  direction,
  month,
  monthlyRent,
  today,
}: {
  id: string;
  direction: "received" | "paid";
  month: string;
  monthlyRent: number;
  today: string;
}) {
  const fieldId = useId();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(monthlyRent));
  const [date, setDate] = useState(today);
  const [pending, startTransition] = useTransition();
  const verb = direction === "received" ? "received" : "paid";

  if (!open) {
    return (
      <Button className="mt-4 w-full" onClick={() => setOpen(true)}>
        Mark {formatMonth(month)} rent {verb}
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
          const result = await recordRent(id, { date, amount: num(amount) });
          if (!result.ok) {
            toast(result.problem);
            return;
          }
          toast(`${formatMonth(month)} rent ${verb}: ${formatINR(num(amount))}`);
          setOpen(false);
          router.refresh();
        });
      }}
    >
      <p className="text-[15px] font-semibold text-ink">
        {formatMonth(month)} rent {verb}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Amount" htmlFor={`${fieldId}-amount`}>
          <AffixInput id={`${fieldId}-amount`} prefix="₹" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label={direction === "received" ? "Received on" : "Paid on"} htmlFor={`${fieldId}-date`}>
          <DatePicker id={`${fieldId}-date`} label={direction === "received" ? "Received on" : "Paid on"} value={date} onChange={setDate} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="plain" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={!(num(amount) > 0) || pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
