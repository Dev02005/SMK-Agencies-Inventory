import type { Metadata } from "next";
import { Suspense } from "react";
import { BackLink, ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { RoleGuard } from "@/components/ui/sub-nav";
import { getReminderSetup } from "@/lib/data";
import { ReminderSettings } from "./reminder-settings";

export const metadata: Metadata = { title: "Reminder messages" };

export default function ReminderMessagesPage() {
  return (
    <RoleGuard roles={["owner", "office"]}>
      <div className="animate-fade-up mx-auto max-w-[960px]">
        <PageHeader
          back={<BackLink href="/settings">Settings</BackLink>}
          title="Reminder messages"
          subtitle="What parties receive when a payment is due, and when it goes"
          actions={<SampleChip />}
        />
        <Suspense fallback={<ListSkeleton rows={8} />}>
          <ReminderData />
        </Suspense>
        <p className="mt-3 px-1 text-[13px] text-ink-secondary">
          WhatsApp messages to parties need a WhatsApp Business provider and approved message templates; SMS needs a DLT-registered sender ID. Both are set up when sending is switched on.
        </p>
      </div>
    </RoleGuard>
  );
}

async function ReminderData() {
  const { templates, rules, previews, firm } = await getReminderSetup();
  return <ReminderSettings templates={templates} rules={rules} previews={previews} firm={firm} />;
}
