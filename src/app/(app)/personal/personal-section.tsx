import { Suspense, type ReactNode } from "react";
import { ListSkeleton } from "@/components/ui/blocks";
import { isPersonalUnlocked, SAMPLE_PIN } from "@/lib/personal-lock";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { OwnerOnly, PinPad } from "./personal-gate";
import { PersonalNav } from "./personal-nav";

/**
 * Wraps each Personal page: owner only, then the PIN pad while locked, the tabs and the page once unlocked. The check lives in
 * the page (not the layout) so nothing of a locked page is rendered or sent; the unlock cookie is request data,
 * so this part streams in.
 */
export function PersonalSection({ children }: { children: ReactNode }) {
  return (
    <OwnerOnly>
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <LockedOrOpen>{children}</LockedOrOpen>
      </Suspense>
    </OwnerOnly>
  );
}

async function LockedOrOpen({ children }: { children: ReactNode }) {
  if (!(await isPersonalUnlocked())) return <PinPad sampleHint={isSupabaseConfigured ? undefined : SAMPLE_PIN} />;
  return (
    <>
      <PersonalNav />
      {children}
    </>
  );
}
