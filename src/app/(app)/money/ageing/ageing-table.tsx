"use client";

import { Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { StatCard, StatRow } from "@/components/ui/blocks";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { FilterChips } from "@/components/ui/filters";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import type { Ageing } from "@/lib/data/types";
import { formatINR, formatShortDate } from "@/lib/format";

type Row = {
  id: string;
  name: string;
  place?: string;
  staff?: string;
  ageing: Ageing;
  unpaid: number;
  overdue: number;
  lastReminder?: { date: string };
  dueForReminder: boolean;
};

const buckets = ["0-7", "8-30", "31-60", "61-90", "90+"] as const;
const bucketTone: Record<(typeof buckets)[number], string> = {
  "0-7": "text-ink",
  "8-30": "text-ink",
  "31-60": "text-warning",
  "61-90": "text-danger",
  "90+": "text-danger font-medium",
};

/** Ageing grid with selection; "Send reminders" goes to WhatsApp / SMS once a provider is connected. */
export function AgeingTable({ rows }: { rows: Row[] }) {
  const toast = useToast();
  const [filter, setFilter] = useState<"all" | "due" | "30">("all");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(rows.filter((r) => r.dueForReminder).map((r) => r.id)));

  const shown = rows.filter((r) => (filter === "due" ? r.dueForReminder : filter === "30" ? r.ageing["31-60"] + r.ageing["61-90"] + r.ageing["90+"] > 0 : true));
  const totals = buckets.map((b) => rows.reduce((s, r) => s + r.ageing[b], 0));
  const toggle = (id: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-4">
      <StatRow>
        <StatCard label="Unpaid in total" value={formatINR(rows.reduce((s, r) => s + r.unpaid, 0))} />
        <StatCard label="Over 30 days" value={formatINR(totals[2] + totals[3] + totals[4])} tone="danger" />
        <StatCard label="Due for a reminder" value={rows.filter((r) => r.dueForReminder).length} tone="warning" hint="parties" />
      </StatRow>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <FilterChips
          label="Show"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: rows.length },
            { value: "due", label: "Due for reminder", count: rows.filter((r) => r.dueForReminder).length },
            { value: "30", label: "Over 30 days" },
          ]}
        />
        <Button
          disabled={selected.size === 0}
          onClick={() => toast(`Sample mode: ${selected.size} WhatsApp reminder${selected.size === 1 ? "" : "s"} checked but not sent. Sending starts once a WhatsApp provider is connected.`)}
        >
          <Send size={17} strokeWidth={1.75} aria-hidden />
          Send reminders ({selected.size})
        </Button>
      </div>

      {/* Phones: one card per party */}
      <ul className="surface divide-y divide-hairline overflow-hidden md:hidden">
        {shown.map((r) => (
          <li key={r.id} className="flex items-start gap-3 px-4 py-3">
            <input type="checkbox" aria-label={`Remind ${r.name}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="mt-0.5 size-6 shrink-0 accent-[var(--accent)]" />
            <div className="min-w-0 flex-1">
              <Link href={`/parties/${r.id}`} className="block truncate text-[15px] text-ink">
                {r.name}
              </Link>
              <p className="text-[12px] text-ink-secondary">
                {r.staff ?? "Office"} · {r.lastReminder ? `reminded ${formatShortDate(r.lastReminder.date)}` : "not reminded"}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {buckets
                  .filter((b) => r.ageing[b] > 0)
                  .map((b) => (
                    <Chip key={b} tone={b === "0-7" || b === "8-30" ? "neutral" : b === "31-60" ? "warning" : "danger"}>
                      {b}d {formatINR(r.ageing[b])}
                    </Chip>
                  ))}
              </div>
            </div>
            <p className="text-[15px] font-medium tabular-nums text-ink">{formatINR(r.unpaid)}</p>
          </li>
        ))}
      </ul>

      {/* Tablet and desktop: the ageing grid */}
      <div className="surface hidden overflow-x-auto md:block">
        <table className="w-full text-[15px]">
          <thead>
            <tr className="border-b border-hairline text-[12px] text-ink-secondary">
              <th className="w-12 py-3 pl-6">
                <span className="sr-only">Select</span>
              </th>
              <th className="px-3 py-3 text-left font-normal">Party</th>
              <th className="hidden px-3 py-3 text-left font-normal lg:table-cell">Staff</th>
              {buckets.map((b) => (
                <th key={b} className="px-3 py-3 text-right font-normal">
                  {b} days
                </th>
              ))}
              <th className="px-3 py-3 text-right font-normal">Total</th>
              <th className="py-3 pl-3 pr-6 text-left font-normal">Last reminder</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {shown.map((r) => (
              <tr key={r.id} className="h-12 hover:bg-card-subtle">
                <td className="pl-6">
                  <input type="checkbox" aria-label={`Remind ${r.name}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="size-4 accent-[var(--accent)]" />
                </td>
                <td className="px-3">
                  <Link href={`/parties/${r.id}`} className="font-medium text-ink hover:text-link hover:underline">
                    {r.name}
                  </Link>
                </td>
                <td className="hidden px-3 text-ink-secondary lg:table-cell">{r.staff ?? "Office"}</td>
                {buckets.map((b) => (
                  <td key={b} className={cn("px-3 text-right tabular-nums", r.ageing[b] ? bucketTone[b] : "text-ink-tertiary")}>
                    {r.ageing[b] ? formatINR(r.ageing[b]) : "–"}
                  </td>
                ))}
                <td className="px-3 text-right font-medium tabular-nums text-ink">{formatINR(r.unpaid)}</td>
                <td className="pl-3 pr-6 text-[13px] text-ink-secondary">
                  {r.lastReminder ? formatShortDate(r.lastReminder.date) : "Never"}
                  {r.dueForReminder && <Chip tone="warning" className="ml-2">Due</Chip>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-hairline">
            <tr className="h-12 font-medium">
              <td />
              <td className="px-3 text-ink">Total</td>
              <td className="hidden lg:table-cell" />
              {totals.map((t, i) => (
                <td key={buckets[i]} className="px-3 text-right tabular-nums text-ink">
                  {formatINR(t)}
                </td>
              ))}
              <td className="px-3 text-right tabular-nums text-ink">{formatINR(rows.reduce((s, r) => s + r.unpaid, 0))}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
