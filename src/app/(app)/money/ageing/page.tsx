import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { getAgeingReport, getReminders } from "@/lib/data";
import { formatDate, formatINR, formatShortDate } from "@/lib/format";
import { AgeingTable } from "./ageing-table";

export const metadata: Metadata = { title: "Ageing & reminders" };

export default function AgeingPage() {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Ageing & reminders"
        subtitle="Unpaid amounts by age. A reminder goes once a bill passes 7 days, then weekly."
        actions={<SampleChip />}
      />
      <Suspense fallback={<ListSkeleton />}>
        <AgeingData />
      </Suspense>
    </div>
  );
}

const statusTone = { delivered: "neutral", read: "good", failed: "danger" } as const;

async function AgeingData() {
  const [report, reminders] = await Promise.all([getAgeingReport(), getReminders()]);
  return (
    <div className="space-y-6">
      <AgeingTable rows={report} />
      <SectionCard title="Reminders sent">
        <div className="-mx-5 -mb-5 md:-mx-6 md:-mb-6 [&_.surface]:rounded-none [&_.surface]:border-0 [&_.surface]:shadow-none">
          <DataTable
            rows={reminders}
            rowKey={(r) => r.id}
            rowHref={(r) => `/parties/${r.partyId}`}
            mobile={(r) => ({
              title: r.partyName,
              subtitle: `${formatShortDate(r.date)} · ${r.channel === "whatsapp" ? "WhatsApp" : "SMS"}`,
              value: formatINR(r.amount),
              meta: <Chip tone={statusTone[r.status]}>{r.status}</Chip>,
            })}
            columns={[
              { key: "party", header: "Party", cell: (r) => r.partyName },
              { key: "date", header: "Sent", cell: (r) => formatDate(r.date), className: "text-ink-secondary" },
              { key: "channel", header: "Channel", cell: (r) => (r.channel === "whatsapp" ? "WhatsApp" : "SMS"), className: "text-ink-secondary" },
              { key: "amount", header: "Amount asked", align: "right", cell: (r) => formatINR(r.amount) },
              { key: "status", header: "Status", cell: (r) => <Chip tone={statusTone[r.status]}>{r.status}</Chip> },
            ]}
          />
        </div>
      </SectionCard>
    </div>
  );
}
