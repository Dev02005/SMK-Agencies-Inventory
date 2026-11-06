import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import { DataTable } from "@/components/ui/data-table";
import { ExportMenu } from "@/components/ui/export-menu";
import { PageHeader } from "@/components/ui/page-header";
import { SampleActionButton } from "@/components/ui/sample-action";
import { getDocuments, getToday } from "@/lib/data";
import { formatDate, formatShortDate } from "@/lib/format";
import { isPersonalUnlocked } from "@/lib/personal-lock";
import { PersonalSection } from "../personal-section";

export const metadata: Metadata = { title: "Documents" };

export default function DocumentsPage() {
  return (
    <PersonalSection>
      <DocumentsContent />
    </PersonalSection>
  );
}

function DocumentsContent() {
  return (
    <>
      <PageHeader
        title="Documents"
        subtitle="Agreements, RCs, policies and receipts, stored privately"
        actions={
          <>
            <SampleChip />
            <ExportMenu title="Documents" />
            <SampleActionButton variant="primary" message="Document upload and storage ready.">
              Add document
            </SampleActionButton>
          </>
        }
      />
      <Suspense fallback={<ListSkeleton rows={5} />}>
        <DocumentList />
      </Suspense>
    </>
  );
}

function ExpiryChip({ expires, today }: { expires?: string; today: string }) {
  if (!expires) return null;
  const days = Math.round((Date.parse(expires) - Date.parse(today)) / 86_400_000);
  if (days < 0) return <Chip tone="danger">Expired</Chip>;
  if (days <= 90) return <Chip tone="warning">Expires {formatShortDate(expires)}</Chip>;
  return <Chip>Valid till {formatShortDate(expires)}</Chip>;
}

async function DocumentList() {
  // Checked here, next to the data: the layout alone cannot stop a page from rendering.
  if (!(await isPersonalUnlocked())) return null;
  const [docs, today] = await Promise.all([getDocuments(), getToday()]);
  return (
    <DataTable
      rows={docs}
      rowKey={(d) => d.id}
      mobile={(d) => ({ title: d.title, subtitle: `${d.kind} · ${d.fileName}`, meta: <ExpiryChip expires={d.expires} today={today} /> })}
      columns={[
        {
          key: "title",
          header: "Document",
          cell: (d) => (
            <span className="flex items-center gap-2">
              <FileText size={16} strokeWidth={1.75} className="shrink-0 text-ink-tertiary" aria-hidden /> {d.title}
            </span>
          ),
        },
        { key: "kind", header: "Type", cell: (d) => d.kind, className: "text-ink-secondary" },
        { key: "file", header: "File", cell: (d) => d.fileName, className: "hidden text-ink-secondary lg:table-cell" },
        { key: "added", header: "Added", cell: (d) => formatDate(d.addedOn), className: "whitespace-nowrap text-ink-secondary" },
        { key: "expiry", header: "", cell: (d) => <ExpiryChip expires={d.expires} today={today} /> },
      ]}
    />
  );
}
