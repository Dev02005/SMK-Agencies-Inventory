import type { Metadata } from "next";
import { Suspense } from "react";
import { NotificationList } from "@/components/notifications/notification-list";
import { ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getProfiles, getToday } from "@/lib/data";
import { getNotifications } from "@/lib/notifications";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <div className="animate-fade-up">
      <PageHeader title="Notifications" subtitle="What needs your attention: approvals, dues, renewals, stock and orders." actions={<SampleChip />} />
      <Suspense fallback={<ListSkeleton />}>
        <NotificationData />
      </Suspense>
    </div>
  );
}

async function NotificationData() {
  const [notices, profiles] = await Promise.all([getNotifications(), getProfiles()]);
  return <NotificationList notices={notices} profiles={profiles} today={getToday()} />;
}
