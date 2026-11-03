import type { Metadata } from "next";
import { Suspense } from "react";
import { NotificationList } from "@/components/notifications/notification-list";
import { ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getShellProfiles, getToday } from "@/lib/data";
import { getMyNotifications } from "@/lib/notifications";

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
  // Every role's notices and the staff list for the owner (View as); anyone else gets only their own.
  const [notices, profiles] = await Promise.all([getMyNotifications(), getShellProfiles()]);
  return <NotificationList notices={notices} profiles={profiles} today={await getToday()} />;
}
