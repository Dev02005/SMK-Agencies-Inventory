import { Suspense, type ReactNode } from "react";
import { ListSkeleton } from "@/components/ui/blocks";
import { RoleGuard } from "@/components/ui/sub-nav";
import { getCurrentUser } from "@/lib/data";

/**
 * Shows its children only to the owner. Checked on the server against the signed-in person, so nobody else gets
 * the data at all; "View as" another role (sample mode) also hides it, to preview what staff see.
 */
export async function OwnerOnly({ what, children }: { what: string; children: ReactNode }) {
  const denied = <div className="surface px-6 py-12 text-center text-[15px] text-ink-secondary">Only the owner can see {what}.</div>;
  const user = await getCurrentUser();
  if (user.role !== "owner") return denied;
  return (
    <RoleGuard roles={["owner"]} fallback={denied}>
      {children}
    </RoleGuard>
  );
}

/** A whole page for the owner only: for anyone else nothing of the page is rendered or sent, only the notice. */
export function OwnerPage({ what, children }: { what: string; children: ReactNode }) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <OwnerOnly what={what}>{children}</OwnerOnly>
    </Suspense>
  );
}
