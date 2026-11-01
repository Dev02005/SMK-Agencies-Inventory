"use client";

import { AlertTriangle, CheckCircle2, FileUp, Loader2, Lock, X } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { Checkbox } from "@/components/ui/checkbox";
import { addBankEntries, maskAccountNo } from "@/lib/bank-book";
import { cn } from "@/lib/cn";
import { formatDate, formatINR, formatShortDate } from "@/lib/format";
import type { ParsedStatement, StatementRow } from "@/lib/statement-parser";
import { readStatement } from "@/lib/statement-pdf";

type Step =
  | { step: "pick"; error?: string }
  | { step: "reading"; name: string }
  | { step: "password"; file: File; wrong: boolean }
  | { step: "preview"; file: File; statement: ParsedStatement; selected: Set<number>; duplicates: Set<number> };

const problems = {
  "no-text": "This PDF is a scanned picture, so there is no text to read. Download the statement from net banking or the bank's app as a PDF instead.",
  "no-table": "No transactions table was found. The PDF needs Date, Debit/Withdrawal, Credit/Deposit and Balance columns.",
  "too-big": "This PDF has more than 80 pages. Download a shorter period and import that.",
  unreadable: "This file could not be opened as a PDF.",
} as const;

const lastFour = (s: string) => s.replace(/\D/g, "").slice(-4);

/**
 * Reads a statement PDF for one bank account and saves the chosen rows as bank entries. Rows already in the
 * account (same date and amount) are found and left unticked, so importing the same statement twice adds nothing.
 */
export function StatementImport({
  account,
  existing,
  onClose,
}: {
  account: { id: string; name: string; accountNo: string };
  existing: { date: string; amount: number }[];
  onClose: () => void;
}) {
  const id = useId();
  const toast = useToast();
  const [state, setState] = useState<Step>({ step: "pick" });
  const [password, setPassword] = useState("");
  const [dragging, setDragging] = useState(false);
  const [otherAccountOk, setOtherAccountOk] = useState(false);

  async function open(file: File, pwd?: string) {
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
      setState({ step: "pick", error: "Choose a PDF file. Statements downloaded from net banking are PDFs." });
      return;
    }
    setState({ step: "reading", name: file.name });
    const result = await readStatement(file, pwd);
    if (result.ok) {
      // Rows matching an entry already in this account (same date and amount) start unticked.
      const counts = new Map<string, number>();
      for (const e of existing) counts.set(`${e.date}|${e.amount.toFixed(2)}`, (counts.get(`${e.date}|${e.amount.toFixed(2)}`) ?? 0) + 1);
      const duplicates = new Set<number>();
      result.statement.rows.forEach((row, i) => {
        const key = `${row.date}|${(row.credit - row.debit).toFixed(2)}`;
        const left = counts.get(key) ?? 0;
        if (left > 0) {
          duplicates.add(i);
          counts.set(key, left - 1);
        }
      });
      const selected = new Set(result.statement.rows.map((_, i) => i).filter((i) => !duplicates.has(i)));
      setOtherAccountOk(false);
      setState({ step: "preview", file, statement: result.statement, selected, duplicates });
    } else if (result.reason === "password" || result.reason === "wrong-password") {
      setState({ step: "password", file, wrong: result.reason === "wrong-password" });
    } else {
      setState({ step: "pick", error: problems[result.reason] });
    }
  }

  function save() {
    if (state.step !== "preview") return;
    const rows = state.statement.rows.filter((_, i) => state.selected.has(i));
    try {
      addBankEntries(
        rows.map((r) => ({
          accountId: account.id,
          date: r.date,
          amount: Math.round((r.credit - r.debit) * 100) / 100,
          description: r.description || (r.credit ? "Money in" : "Money out"),
          ref: r.ref,
          source: "statement" as const,
          statementBalance: r.balance,
        })),
      );
      toast(`${rows.length} ${rows.length === 1 ? "entry" : "entries"} from the statement saved to ${account.name} on this device.`);
      onClose();
    } catch (error) {
      toast((error as Error).message);
    }
  }

  return (
    <section aria-labelledby={`${id}-title`} className="surface mb-5 p-5 md:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id={`${id}-title`} className="text-[17px] font-semibold tracking-[-0.3px] text-ink">
            Import a bank statement
          </h2>
          <p className="text-[13px] text-ink-secondary">The PDF is read on this device; it is not uploaded anywhere.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close import" className="grid size-8 shrink-0 place-items-center rounded-full bg-hairline text-ink-secondary">
          <X size={16} strokeWidth={2} aria-hidden />
        </button>
      </div>

      {state.step === "pick" && (
        <>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) void open(file);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-5 py-10 text-center transition-colors focus-within:ring-2 focus-within:ring-accent/40",
              dragging ? "border-accent bg-accent-soft" : "border-divider hover:bg-card-subtle",
            )}
          >
            <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent">
              <FileUp size={22} strokeWidth={1.75} aria-hidden />
            </span>
            <span className="text-[17px] font-medium text-ink">Choose the statement PDF</span>
            <span className="text-[13px] text-ink-secondary">or drop it here · SBI, HDFC, Union Bank, APGB, KVB and most other banks</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void open(file);
              }}
            />
          </label>
          {state.error && (
            <p role="alert" className="mt-3 flex items-start gap-2 text-[14px] text-danger">
              <AlertTriangle size={17} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden />
              {state.error}
            </p>
          )}
        </>
      )}

      {state.step === "reading" && (
        <p role="status" className="flex items-center gap-3 py-8 text-[15px] text-ink-secondary">
          <Loader2 size={20} strokeWidth={2} className="animate-spin text-accent" aria-hidden />
          Reading {state.name}…
        </p>
      )}

      {state.step === "password" && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (password) void open(state.file, password);
          }}
        >
          <p className="flex items-start gap-2 text-[15px] text-ink">
            <Lock size={17} strokeWidth={2} className="mt-0.5 shrink-0 text-ink-secondary" aria-hidden />
            {state.file.name} is locked with a password. Banks often use the customer ID or a date of birth.
          </p>
          <Field label="Statement password" htmlFor={`${id}-pwd`} error={state.wrong ? "That password didn't open it. Try again." : undefined}>
            <input id={`${id}-pwd`} type="password" autoComplete="off" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="plain" className="px-3" onClick={() => setState({ step: "pick" })}>
              Choose another file
            </Button>
            <Button type="submit" disabled={!password}>
              Open
            </Button>
          </div>
        </form>
      )}

      {state.step === "preview" && (
        <Preview
          state={state}
          account={account}
          otherAccountOk={otherAccountOk}
          setOtherAccountOk={setOtherAccountOk}
          setSelected={(selected) => setState({ ...state, selected })}
          onAnother={() => setState({ step: "pick" })}
          onSave={save}
        />
      )}
    </section>
  );
}

function Preview({
  state,
  account,
  otherAccountOk,
  setOtherAccountOk,
  setSelected,
  onAnother,
  onSave,
}: {
  state: Extract<Step, { step: "preview" }>;
  account: { name: string; accountNo: string };
  otherAccountOk: boolean;
  setOtherAccountOk: (v: boolean) => void;
  setSelected: (s: Set<number>) => void;
  onAnother: () => void;
  onSave: () => void;
}) {
  const { statement, selected, duplicates } = state;
  const rows = statement.rows;
  const flagged = rows.filter((r) => r.check === "mismatch").length;
  const checked = rows.filter((r) => r.check === "ok" || r.check === "fixed").length;
  const statementLast = statement.accountNo ? lastFour(statement.accountNo) : "";
  const accountLast = lastFour(account.accountNo);
  const otherAccount = Boolean(statementLast && accountLast.length === 4 && statementLast !== accountLast);
  const totalIn = rows.reduce((s, r) => s + r.credit, 0);
  const totalOut = rows.reduce((s, r) => s + r.debit, 0);
  const toggle = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelected(next);
  };
  const allOn = selected.size === rows.length;
  const canSave = selected.size > 0 && (!otherAccount || otherAccountOk);

  return (
    <div className="space-y-4">
      <dl className="grid gap-3 rounded-2xl bg-card-subtle p-4 text-[14px] sm:grid-cols-3">
        <div>
          <dt className="text-[12px] text-ink-secondary">Statement</dt>
          <dd className="text-ink">
            {statement.bank ?? "Bank not printed"}
            {statement.accountNo && ` · ${maskAccountNo(statement.accountNo)}`}
          </dd>
          {statement.from && statement.to && (
            <dd className="text-[13px] text-ink-secondary">
              {formatDate(statement.from)} – {formatDate(statement.to)}
            </dd>
          )}
        </div>
        <div>
          <dt className="text-[12px] text-ink-secondary">Transactions</dt>
          <dd className="text-ink">{rows.length}</dd>
          <dd className="text-[13px] text-ink-secondary">
            In {formatINR(totalIn)} · out {formatINR(totalOut)}
          </dd>
        </div>
        <div>
          <dt className="text-[12px] text-ink-secondary">Balance check</dt>
          {flagged ? (
            <dd className="flex items-center gap-1.5 text-warning">
              <AlertTriangle size={16} strokeWidth={2} aria-hidden /> {flagged} {flagged === 1 ? "row doesn't" : "rows don't"} add up: look before saving
            </dd>
          ) : (
            <dd className="flex items-center gap-1.5 text-good">
              <CheckCircle2 size={16} strokeWidth={2} aria-hidden /> {checked === rows.length ? "Every row matches the statement's balance" : `${checked} of ${rows.length} rows checked`}
            </dd>
          )}
        </div>
      </dl>

      {otherAccount && (
        <div role="alert" className="rounded-2xl bg-warning-soft p-4 text-[14px] text-warning">
          <p className="flex items-start gap-2">
            <AlertTriangle size={17} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden />
            This statement is for account ending {statementLast}, but {account.name} ends {accountLast}.
          </p>
          <label className="mt-2 flex items-center gap-2 text-ink">
            <Checkbox checked={otherAccountOk} onChange={(e) => setOtherAccountOk(e.target.checked)} />
            Save it to {account.name} anyway
          </label>
        </div>
      )}

      {duplicates.size > 0 && (
        <p className="text-[13px] text-ink-secondary">
          {duplicates.size} {duplicates.size === 1 ? "row is" : "rows are"} already in this account (same date and amount) and left unticked.
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-[14px] text-ink">
          <Checkbox
           
            checked={allOn}
            onChange={() => setSelected(allOn ? new Set() : new Set(rows.map((_, i) => i)))}
          />
          Select all
        </label>
        <span className="text-[13px] text-ink-secondary">{selected.size} selected</span>
      </div>

      <ul className="divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline md:hidden">
        {rows.map((r, i) => (
          <li key={i}>
            <label className="flex items-start gap-3 px-3 py-3">
              <Checkbox className="mt-0.5" checked={selected.has(i)} onChange={() => toggle(i)} aria-label={`Include ${formatShortDate(r.date)} ${r.description}`} />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-[14px] text-ink">{r.description || "—"}</span>
                <span className="block text-[12px] text-ink-secondary">
                  {formatShortDate(r.date)}
                  {r.ref && ` · ${r.ref}`}
                  {duplicates.has(i) && " · already in"}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <Amount row={r} />
                <CheckMark row={r} />
              </span>
            </label>
          </li>
        ))}
      </ul>

      <div className="hidden max-h-[480px] overflow-auto rounded-2xl border border-hairline md:block" tabIndex={0} role="region" aria-label="Statement rows">
        <table className="w-full text-[14px]">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-hairline text-left text-[12px] text-ink-secondary">
              <th className="w-10 py-2.5 pl-4">
                <span className="sr-only">Include</span>
              </th>
              <th className="px-3 py-2.5 font-normal">Date</th>
              <th className="px-3 py-2.5 font-normal">Details</th>
              <th className="px-3 py-2.5 text-right font-normal">Out</th>
              <th className="px-3 py-2.5 text-right font-normal">In</th>
              <th className="px-3 py-2.5 text-right font-normal">Statement balance</th>
              <th className="py-2.5 pl-3 pr-4 font-normal">
                <span className="sr-only">Check</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {rows.map((r, i) => (
              <tr key={i} className={cn(!selected.has(i) && "text-ink-secondary", r.check === "mismatch" && "bg-warning-soft/60")}>
                <td className="py-2.5 pl-4 align-top">
                  <Checkbox size="sm" checked={selected.has(i)} onChange={() => toggle(i)} aria-label={`Include ${formatShortDate(r.date)} ${r.description}`} />
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 align-top">{formatShortDate(r.date)}</td>
                <td className="px-3 py-2.5 align-top">
                  <span className="line-clamp-2 block max-w-[440px]">{r.description || "—"}</span>
                  <span className="flex flex-wrap gap-2 text-[12px] text-ink-secondary">
                    {r.ref && <span>Ref {r.ref}</span>}
                    {duplicates.has(i) && <Chip>Already in</Chip>}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right align-top tabular-nums">{r.debit ? formatINR(r.debit) : ""}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right align-top tabular-nums text-good">{r.credit ? formatINR(r.credit) : ""}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right align-top tabular-nums">{r.balance !== undefined ? formatINR(r.balance) : ""}</td>
                <td className="py-2.5 pl-3 pr-4 align-top">
                  <CheckMark row={r} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-hairline pt-4">
        <Button variant="plain" className="mr-auto px-0" onClick={onAnother}>
          Choose another file
        </Button>
        <Button onClick={onSave} disabled={!canSave}>
          Save {selected.size} {selected.size === 1 ? "entry" : "entries"}
        </Button>
      </div>
    </div>
  );
}

function Amount({ row }: { row: StatementRow }) {
  return row.credit ? (
    <span className="block text-[14px] font-medium tabular-nums text-good">+ {formatINR(row.credit)}</span>
  ) : (
    <span className="block text-[14px] font-medium tabular-nums text-ink">− {formatINR(row.debit)}</span>
  );
}

function CheckMark({ row }: { row: StatementRow }) {
  if (row.check === "mismatch") return <AlertTriangle size={16} strokeWidth={2} className="ml-auto text-warning" aria-label="Doesn't match the running balance" />;
  if (row.check === "unknown") return null;
  return <CheckCircle2 size={16} strokeWidth={2} className="ml-auto text-good" aria-label="Matches the running balance" />;
}
