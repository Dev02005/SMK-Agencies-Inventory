import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { getProfiles } from "@/lib/data";
import { getNotifications } from "@/lib/notifications";

/** Everything behind sign-in holds business records, so search engines are told not to list or follow it. */
export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

/**
 * Sample mode sends every role's notifications and the staff list, because "View as" picks the role in the
 * browser. With login this must read the signed-in user and send only noticesFor(their role, their id).
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const [profiles, notices] = await Promise.all([getProfiles(), getNotifications()]);
  return (
    <AppShell profiles={profiles} notices={notices}>
      {children}
    </AppShell>
  );
}
