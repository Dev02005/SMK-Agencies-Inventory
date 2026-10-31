"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { Suspense, use } from "react";
import type { Role } from "@/lib/data/types";
import { noticesFor, type Notice } from "@/lib/notices";
import { useReadNotices } from "@/lib/notices-read";

/** Notices are worked out for today at request time, so the count streams in; the bell shows at once. */
export function NotificationBell({ notices, role, profileId }: { notices: Promise<Notice[]>; role: Role; profileId: string }) {
  return (
    <Suspense fallback={<BellLink unread={0} />}>
      <UnreadBell notices={notices} role={role} profileId={profileId} />
    </Suspense>
  );
}

function UnreadBell({ notices, role, profileId }: { notices: Promise<Notice[]>; role: Role; profileId: string }) {
  const [read] = useReadNotices();
  return <BellLink unread={noticesFor(use(notices), role, profileId).filter((n) => !read.has(n.id)).length} />;
}

function BellLink({ unread }: { unread: number }) {
  return (
    <Link
      href="/notifications"
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      title="Notifications"
      className="relative grid size-9 place-items-center rounded-full text-ink-secondary transition-colors hover:bg-hairline hover:text-ink"
    >
      <Bell size={20} strokeWidth={1.75} aria-hidden />
      {unread > 0 && (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[11px] font-semibold tabular-nums text-white ring-2 ring-page"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
