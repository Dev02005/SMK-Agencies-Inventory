"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DataTable } from "@/components/ui/data-table";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import type { SalarySlip } from "@/lib/data/types";
import { formatDate, formatINR, formatMonth } from "@/lib/format";

type Row = SalarySlip & { name: string };

/** Month salary sheet: gross − loan instalments = net. */
export function SalarySheet({ sheets }: { sheets: Record<string, Row[]> }) {
  const months = Object.keys(sheets);
  const [month, setMonth] = useState(months[0]);
  const toast = useToast();
  const rows = sheets[month];
  const unpaid = rows.filter((r) => !r.paidOn);
  const total = (key: "gross" | "loanDeduction" | "net") => rows.reduce((s, r) => s + r[key], 0);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented label="Month" className="w-72" value={month} onChange={setMonth} options={months.map((m) => ({ value: m, label: formatMonth(m) }))} />
        {unpaid.length > 0 && (
          <Button onClick={() => toast(`Sample mode: ${unpaid.length} salaries totalling ${formatINR(unpaid.reduce((s, r) => s + r.net, 0))} would be marked paid and the loan instalments recorded.`)}>
            Pay {formatINR(unpaid.reduce((s, r) => s + r.net, 0))}
          </Button>
        )}
      </div>
      <DataTable
        rows={rows}
        rowKey={(r) => r.profileId}
        rowHref={(r) => `/people/${r.profileId}`}
        mobile={(r) => ({
          title: r.name,
          subtitle: `${formatINR(r.gross)} − ${formatINR(r.loanDeduction)} loan`,
          value: formatINR(r.net),
          meta: r.paidOn ? <Chip tone="good">Paid</Chip> : <Chip tone="warning">To pay</Chip>,
        })}
        columns={[
          { key: "name", header: "Staff", cell: (r) => r.name },
          { key: "gross", header: "Salary", align: "right", cell: (r) => formatINR(r.gross) },
          { key: "loan", header: "Loan instalment", align: "right", cell: (r) => (r.loanDeduction ? `− ${formatINR(r.loanDeduction)}` : "") },
          { key: "net", header: "Net pay", align: "right", cell: (r) => <span className="font-semibold">{formatINR(r.net)}</span> },
          { key: "status", header: "", cell: (r) => (r.paidOn ? <Chip tone="good">Paid {formatDate(r.paidOn)}</Chip> : <Chip tone="warning">To pay</Chip>) },
        ]}
        footer={
          <tr className="h-12 font-medium">
            <td className="px-4 pl-6 text-ink">Total</td>
            <td className="px-4 text-right tabular-nums">{formatINR(total("gross"))}</td>
            <td className="px-4 text-right tabular-nums">{total("loanDeduction") ? `− ${formatINR(total("loanDeduction"))}` : ""}</td>
            <td className="px-4 text-right tabular-nums">{formatINR(total("net"))}</td>
            <td />
          </tr>
        }
      />
    </section>
  );
}
