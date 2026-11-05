import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BackLink, DetailList, ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { KeyRound, LockKeyhole } from "lucide-react";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { TimeLeft } from "@/components/ui/live-clock";
import { PageHeader } from "@/components/ui/page-header";
import { requireSession } from "@/lib/auth";
import { getCurrentUser, getFirm, getNow } from "@/lib/data";
import { roleLabels } from "@/lib/labels";
import { pinIsSet } from "@/lib/personal-lock";
import { ChangePasswordForm, ChangePinForm, SignOutButton } from "./account-forms";
import { ProfileCard } from "./profile-card";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <div className="animate-fade-up mx-auto max-w-[760px]">
      <PageHeader back={<BackLink href="/settings">Settings</BackLink>} title="Account" subtitle="Your name, photo, sign-in and automatic sign-out" actions={<SampleChip />} />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <AccountDetails />
      </Suspense>
    </div>
  );
}

const signedInAt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

async function AccountDetails() {
  const [session, user, firm, now] = await Promise.all([requireSession(), getCurrentUser(), getFirm(), getNow()]);
  const pinSet = user.role === "owner" && (await pinIsSet());

  return (
    <div className="space-y-4">
      <ProfileCard
        key={`${user.fullName}-${user.photoVersion ?? ""}`}
        user={{ id: user.id, fullName: user.fullName, initials: user.initials, photoVersion: user.photoVersion }}
        subtitle={`${roleLabels[user.role]} · ${firm.name}`}
      />

      <SectionCard title="Sign-in">
        <DetailList
          items={[
            { label: "Sign in with", value: <span className="tabular-nums">{[`+91 ${user.mobile}`, user.email].filter(Boolean).join(" or ")}</span> },
            { label: "Signed in", value: signedInAt.format(session.since) },
            {
              label: "Signs out at",
              value: (
                <>
                  12:00 midnight · in <TimeLeft now={now} until={session.until} />
                </>
              ),
            },
          ]}
        />
        <p className="mt-3 text-[13px] text-ink-secondary">
          Everyone is signed out at 12 midnight India time, so a phone or computer left signed in can&apos;t be used the next day.
        </p>
        <div className="mt-4">
          <SignOutButton />
        </div>
      </SectionCard>

      <CollapsibleCard title="Change sign-in code" hint="The 6-digit code you sign in with" icon={KeyRound}>
        <ChangePasswordForm />
      </CollapsibleCard>

      {user.role === "owner" && (
        <CollapsibleCard title={pinSet ? "Change Personal PIN" : "Personal PIN"} hint="The 4-digit PIN that locks Personal" icon={LockKeyhole}>
          {pinSet ? (
            <ChangePinForm />
          ) : (
            <p className="text-[15px] text-ink-secondary">
              You choose it the first time you open{" "}
              <Link href="/personal" className="text-link hover:underline">
                Personal
              </Link>
              .
            </p>
          )}
        </CollapsibleCard>
      )}

      {user.role === "owner" && (
        <p className="px-1 text-[13px] text-ink-secondary">
          Staff logins and roles are in{" "}
          <Link href="/settings/users" className="text-link hover:underline">
            Settings › Users &amp; roles
          </Link>
          .
        </p>
      )}
    </div>
  );
}
