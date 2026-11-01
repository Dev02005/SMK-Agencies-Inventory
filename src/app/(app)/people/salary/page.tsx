import type { Metadata } from "next";
import { Suspense } from "react";
import { SimpleForm } from "@/components/forms/simple-form";
import { ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import { DataTable } from "@/components/ui/data-table";
import { ExportMenu } from "@/components/ui/export-menu";
import { PageHeader } from "@/components/ui/page-header";
import { RoleGuard } from "@/components/ui/sub-nav";
import { getEmployees, getLoans, getSalarySheet, getToday } from "@/lib/data";
import { formatDate, formatINR, shiftMonth } from "@/lib/format";
import { SalarySheet } from "./salary-sheet";

export const metadata: Metadata = { title: "Salary & loans" };

export default function SalaryPage() {
  return (
    <>
      <PageHeader
        title="Salary & loans"
        subtitle="Salary and loans are kept apart: a loan instalment taken from salary lowers both the loan and the pay."
        actions={
          <>
            <SampleChip />
            <ExportMenu title={"Salary and loans"} />
          </>
        }
      />
      <RoleGuard roles={["owner", "office"]}>
        <Suspense fallback={<ListSkeleton />}>
          <SalaryData />
        </Suspense>
      </RoleGuard>
    </>
  );
}

async function SalaryData() {
  const thisMonth = (await getToday()).slice(0, 7);
  const lastMonth = shiftMonth(thisMonth, -1);
  const [current, previous, loans, staff] = await Promise.all([getSalarySheet(thisMonth), getSalarySheet(lastMonth), getLoans(), getEmployees()]);

  return (
    <div className="space-y-6">
      <SalarySheet sheets={{ [thisMonth]: current, [lastMonth]: previous }} />

      <section className="space-y-3">
        <h2 className="text-[22px] font-semibold tracking-[-0.3px] text-ink">Loans and advances</h2>
        <DataTable
          rows={loans}
          rowKey={(l) => l.id}
          rowHref={(l) => `/people/${l.profileId}`}
          mobile={(l) => ({
            title: l.name,
            subtitle: `${l.kind === "loan" ? "Loan" : "Advance"} of ${formatINR(l.amount)} · ${formatDate(l.date)} · ${formatINR(l.emi)} a month`,
            value: formatINR(l.balance),
            meta: l.balance === 0 ? <Chip tone="good">Closed</Chip> : undefined,
          })}
          columns={[
            { key: "name", header: "Staff", cell: (l) => l.name },
            { key: "kind", header: "Type", cell: (l) => (l.kind === "loan" ? "Loan" : "Salary advance"), className: "text-ink-secondary" },
            { key: "date", header: "Given on", cell: (l) => formatDate(l.date), className: "whitespace-nowrap text-ink-secondary" },
            { key: "note", header: "For", cell: (l) => l.note ?? "–", className: "hidden text-ink-secondary lg:table-cell" },
            { key: "amount", header: "Amount", align: "right", cell: (l) => formatINR(l.amount) },
            { key: "emi", header: "Monthly", align: "right", cell: (l) => formatINR(l.emi) },
            { key: "repaid", header: "Repaid", align: "right", cell: (l) => formatINR(l.amount - l.balance) },
            { key: "balance", header: "Balance", align: "right", cell: (l) => (l.balance === 0 ? <Chip tone="good">Closed</Chip> : formatINR(l.balance)) },
          ]}
        />
      </section>

      <SectionCard title="Give a loan or advance">
        <SimpleForm
          thing="loan"
          submitLabel="Save"
          fields={[
            { name: "staff", label: "Staff member", type: "select", options: staff.map((s) => ({ value: s.id, label: s.fullName })) },
            {
              name: "kind",
              label: "Type",
              type: "select",
              options: [
                { value: "advance", label: "Salary advance" },
                { value: "loan", label: "Loan" },
              ],
            },
            { name: "amount", label: "Amount", type: "number", prefix: "₹", required: true },
            { name: "emi", label: "Taken back each month", type: "number", prefix: "₹", required: true, hint: "Deducted from salary until repaid" },
            { name: "date", label: "Date", type: "date" },
            { name: "note", label: "Reason", placeholder: "Optional" },
          ]}
        />
      </SectionCard>
    </div>
  );
}
