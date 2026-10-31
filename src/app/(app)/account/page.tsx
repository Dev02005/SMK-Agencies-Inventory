import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DetailList, ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { TimeLeft } from "@/components/ui/live-clock";
import { PageHeader } from "@/components/ui/page-header";
import { requireSession } from "@/lib/auth";
import { getCurrentUser, getFirm, getNow } from "@/lib/data";
import { roleLabels } from "@/lib/labels";
import { loginIdOf } from "@/lib/session";
import { ChangePasswordForm, SignOutButton } from "./account-forms";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <div className="animate-fade-up mx-auto max-w-[760px]">
      <PageHeader title="Account" subtitle="Your sign-in, password and automatic sign-out" actions={<SampleChip />} />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <AccountDetails />
      </Suspense>
    </div>
  );
}

const signedInAt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

async function AccountDetails() {
  const [session, user, firm, now] = await Promise.all([requireSession(), getCurrentUser(), getFirm(), getNow()]);

  return (
    <div className="space-y-4">
      <section className="surface flex items-center gap-4 p-5 md:p-6">
        <span aria-hidden className="grid size-16 shrink-0 place-items-center rounded-full bg-accent-soft text-[22px] font-semibold text-accent">
          {user.initials}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-[22px] font-semibold tracking-[-0.3px] text-ink">{user.fullName}</h2>
          <p className="text-[15px] text-ink-secondary">
            {roleLabels[user.role]} · {firm.name}
          </p>
        </div>
      </section>

      <SectionCard title="Sign-in">
        <DetailList
          items={[
            { label: "Login ID", value: <span className="tabular-nums">{loginIdOf(session.userId)}</span> },
            { label: "Mobile", value: <span className="tabular-nums">+91 {user.mobile}</span> },
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

      <SectionCard title="Change password">
        <ChangePasswordForm />
      </SectionCard>

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
