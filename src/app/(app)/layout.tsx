import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { MidnightSignOut, SignedInSync } from "@/components/shell/midnight-sign-out";
import { requireSession } from "@/lib/auth";
import { getCurrentUser, getFirm, getShellProfiles } from "@/lib/data";
import { getMyNotifications } from "@/lib/notifications";

/** Everything behind sign-in holds business records, so search engines are told not to list or follow it. */
export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

/**
 * The owner gets the staff list and every role's notices, because "View as" picks the role in the browser; anyone
 * else gets only their own profile and notices. Both depend on who is signed in, so they stream in.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const firm = await getFirm();
  return (
    <>
      <AppShell people={getShellProfiles()} firmName={firm.name} notices={getMyNotifications()}>
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
