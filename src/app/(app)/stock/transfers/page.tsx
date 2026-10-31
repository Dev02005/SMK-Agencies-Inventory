import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { SampleActionButton } from "@/components/ui/sample-action";
import { getProducts, getTransfers } from "@/lib/data";
import { formatDate, formatShortDate } from "@/lib/format";
import { describeQuantities } from "@/lib/quantities";

export const metadata: Metadata = { title: "Transfers" };

export default function TransfersPage() {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Godown transfers"
        subtitle="Stock moved between godowns. It leaves one godown at once and joins the other when received."
        actions={
          <>
            <SampleChip />
            <ButtonLink href="/stock/transfers/new">New transfer</ButtonLink>
          </>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <Transfers />
      </Suspense>
    </div>
  );
}

async function Transfers() {
  const [transfers, products] = await Promise.all([getTransfers(), getProducts()]);
  const status = (s: string) => (s === "received" ? <Chip tone="good">Received</Chip> : <Chip tone="warning">On the way</Chip>);
  return (
    <DataTable
      rows={transfers}
      rowKey={(t) => t.id}
      mobile={(t) => ({
        title: `${t.fromName} → ${t.toName}`,
        subtitle: `#${t.transferNo} · ${formatShortDate(t.date)} · ${describeQuantities(t.lines, products)}`,
        meta: status(t.status),
      })}
      columns={[
        { key: "no", header: "No.", cell: (t) => `#${t.transferNo}` },
        { key: "date", header: "Date", cell: (t) => formatDate(t.date), className: "whitespace-nowrap text-ink-secondary" },
        { key: "route", header: "From → to", cell: (t) => `${t.fromName} → ${t.toName}` },
        { key: "qty", header: "Quantity", cell: (t) => describeQuantities(t.lines, products), className: "whitespace-nowrap text-ink-secondary" },
        { key: "vehicle", header: "Vehicle", cell: (t) => t.vehicle, className: "hidden text-ink-secondary lg:table-cell" },
        { key: "status", header: "", cell: (t) => status(t.status) },
        {
          key: "action",
          header: "",
          align: "right",
          cell: (t) =>
            t.status === "in_transit" && (
              <SampleActionButton variant="plain" message="Sample mode: the receiving godown would confirm the count and the stock would join it.">
                Mark received
              </SampleActionButton>
            ),
        },
      ]}
    />
  );
}
