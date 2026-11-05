import type { Metadata } from "next";
import { Suspense } from "react";
import { AddPanel } from "@/components/forms/add-panel";
import { SimpleForm } from "@/components/forms/simple-form";
import { ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import { DataTable } from "@/components/ui/data-table";
import { ExportMenu } from "@/components/ui/export-menu";
import { PageHeader } from "@/components/ui/page-header";
import { getPolicies } from "@/lib/data";
import { formatDate, formatINR, formatShortDate } from "@/lib/format";
import { isPersonalUnlocked } from "@/lib/personal-lock";
import { PersonalSection } from "../personal-section";

export const metadata: Metadata = { title: "Insurance" };

const kindLabel = { life: "Life", health: "Health", vehicle: "Vehicle", property: "Property" } as const;

function DueChip({ days }: { days: number }) {
  if (days < 0) return <Chip tone="danger">{-days} days late</Chip>;
  if (days <= 30) return <Chip tone="warning">{days === 0 ? "Today" : `In ${days} days`}</Chip>;
  return <Chip>In {days} days</Chip>;
}

export default function InsurancePage() {
  return (
    <PersonalSection>
      <InsuranceContent />
    </PersonalSection>
  );
}

function InsuranceContent() {
  return (
    <>
      <PageHeader title="Insurance" subtitle="Every policy, sorted by the next premium due" actions={
          <>
            <SampleChip />
            <ExportMenu title={"Insurance"} />
          </>
        } />
      <AddPanel label="Add insurance" title="Add insurance">
        <SimpleForm
          thing="policy"
          submitLabel="Add policy"
          fields={[
            { name: "title", label: "What it covers", required: true, placeholder: "e.g. Delivery lorry" },
            {
              name: "kind",
              label: "Type",
              type: "select",
              options: Object.entries(kindLabel).map(([value, label]) => ({ value, label })),
            },
            { name: "insurer", label: "Insurer", required: true },
            { name: "policyNo", label: "Policy number" },
            { name: "premium", label: "Premium", type: "number", prefix: "₹", required: true },
            { name: "nextDue", label: "Next due date", type: "date" },
          ]}
        />
      </AddPanel>
      <Suspense fallback={<ListSkeleton rows={5} />}>
        <Policies />
      </Suspense>
    </>
  );
}

async function Policies() {
  // Checked here, next to the data: the layout alone cannot stop a page from rendering.
  if (!(await isPersonalUnlocked())) return null;
  const policies = await getPolicies();
  return (
    <DataTable
      rows={policies}
      rowKey={(p) => p.id}
      mobile={(p) => ({
        title: p.title,
        subtitle: `${kindLabel[p.kind]} · ${p.insurer} · due ${formatShortDate(p.nextDue)}`,
        value: formatINR(p.premium),
        meta: <DueChip days={p.daysLeft} />,
      })}
      columns={[
        { key: "title", header: "Policy", cell: (p) => p.title },
        { key: "kind", header: "Type", cell: (p) => kindLabel[p.kind], className: "text-ink-secondary" },
        { key: "insurer", header: "Insurer", cell: (p) => `${p.insurer} · ${p.policyNo}`, className: "hidden text-ink-secondary lg:table-cell" },
        { key: "cover", header: "Cover", align: "right", cell: (p) => formatINR(p.sumAssured), className: "hidden xl:table-cell" },
        { key: "premium", header: "Premium", align: "right", cell: (p) => formatINR(p.premium) },
        { key: "due", header: "Next due", cell: (p) => formatDate(p.nextDue), className: "whitespace-nowrap text-ink-secondary" },
        { key: "chip", header: "", cell: (p) => <DueChip days={p.daysLeft} /> },
      ]}
    />
  );
}
