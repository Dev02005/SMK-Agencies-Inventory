import type { Metadata } from "next";
import { Suspense } from "react";
import { BackLink, ListSkeleton } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { RoleGuard } from "@/components/ui/sub-nav";
import { getFirm } from "@/lib/data";
import { getWhatsAppConfig, getWhatsAppMessages } from "@/lib/whatsapp/service";
import { WhatsAppCenter } from "./whatsapp-center";

export const metadata: Metadata = { title: "WhatsApp Bot & Messaging" };

export default async function WhatsAppSettingsPage() {
  return (
    <RoleGuard roles={["owner", "office"]}>
      <div className="animate-fade-up mx-auto max-w-[980px] space-y-4">
        <PageHeader
          back={<BackLink href="/settings">Settings</BackLink>}
          title="WhatsApp Bot & Reminders"
          subtitle="Automated payment receipts, balance reminders, and 2-way Telugu customer bot"
        />
        <Suspense fallback={<ListSkeleton rows={8} />}>
          <WhatsAppSettingsData />
        </Suspense>
      </div>
    </RoleGuard>
  );
}

async function WhatsAppSettingsData() {
  const [config, messages, firm] = await Promise.all([
    getWhatsAppConfig(),
    getWhatsAppMessages(),
    getFirm(),
  ]);

  return (
    <WhatsAppCenter
      initialConfig={config}
      initialMessages={messages}
      firmName={firm.name}
      firmPhone={firm.phone}
    />
  );
}
