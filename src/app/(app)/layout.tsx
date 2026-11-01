import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { MidnightSignOut, SignedInSync } from "@/components/shell/midnight-sign-out";
import { requireSession } from "@/lib/auth";
import { getCurrentUser, getFirm, getProfiles } from "@/lib/data";
import { getNotifications } from "@/lib/notifications";

/** Everything behind sign-in holds business records, so search engines are told not to list or follow it. */
export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

/**
 * Sample mode sends every role's notifications and the staff list, because "View as" picks the role in the
 * browser. With Supabase this must send only noticesFor(the signed-in user's role, their id).
 * Notices are for today, so they stream in (the shell doesn't wait for them).
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const [profiles, firm] = await Promise.all([getProfiles(), getFirm()]);
  return (
    <>
      <AppShell profiles={profiles} firmName={firm.name} notices={getNotifications()}>
        {children}
      </AppShell>
      <Suspense>
        <SessionCheck />
      </Suspense>
    </>
  );
}

async function SessionCheck() {
  const [{ until }, user] = await Promise.all([requireSession(), getCurrentUser()]);
  return (
    <>
      <MidnightSignOut until={until} />
      <SignedInSync id={user.id} role={user.role} />
    </>
  );
}
