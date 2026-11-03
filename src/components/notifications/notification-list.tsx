"use client";

import { BadgeCheck, CalendarClock, CheckCheck, ClipboardList, IndianRupee, Lock, Package, Truck, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { IconButton } from "@/components/ui/button";
import { DataTools } from "@/components/ui/data-tools";
import { useDateFilter } from "@/components/ui/date-filter";
import { ExportTable } from "@/components/ui/export-table";
import { FilterChips } from "@/components/ui/filters";
import { cn } from "@/lib/cn";
import type { Profile } from "@/lib/data/types";
import { inDateFilter } from "@/lib/date-filter";
import { formatDate, formatShortDate } from "@/lib/format";
import { noticesFor, type Notice, type NoticeKind } from "@/lib/notices";
import { useReadNotices } from "@/lib/notices-read";
import { useViewAs } from "@/lib/roles";

const icons: Record<NoticeKind, LucideIcon> = {
  approval: BadgeCheck,
  dues: IndianRupee,
  renewal: CalendarClock,
  stock: Package,
  order: ClipboardList,
  cash: Wallet,
  personal: Lock,
  delivery: Truck,
  lorry: Truck,
};

const toneClass: Record<Notice["tone"], string> = {
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  accent: "bg-accent-soft text-accent",
  neutral: "bg-hairline text-ink-secondary",
};

const daysAgo = (date: string, today: string) => Math.round((Date.parse(today) - Date.parse(date)) / 86_400_000);

export function NotificationList({ notices, profiles, today }: { notices: Notice[]; profiles: Profile[]; today: string }) {
  const [role] = useViewAs();
  const user = profiles.find((p) => p.role === role) ?? profiles[0];
  const [read, markRead] = useReadNotices();
  const [show, setShow] = useState<"all" | "unread">("all");
  const dates = useDateFilter();

  const mine = noticesFor(notices, role, user.id).filter((n) => inDateFilter(n.date, dates));
  const unread = mine.filter((n) => !read.has(n.id));
  const visible = show === "unread" ? unread : mine;
  const groups = [
    { label: "Today", items: visible.filter((n) => n.date === today) },
    { label: "Earlier", items: visible.filter((n) => n.date !== today) },
  ].filter((g) => g.items.length);

  return (
    <div className="space-y-4">
      <DataTools title="Notifications" />
      <ExportTable columns={["Date", "Notice", "Details", "Read"]} rows={visible.map((n) => [formatDate(n.date), n.title, n.body, read.has(n.id) ? "Yes" : "No"])} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterChips
          label="Show"
          value={show}
          onChange={setShow}
          options={[
            { value: "all", label: "All", count: mine.length },
            { value: "unread", label: "Unread", count: unread.length },
          ]}
        />
        <IconButton label="Mark all as read" onClick={() => markRead(mine.map((n) => n.id))} disabled={!unread.length}>
          <CheckCheck size={19} strokeWidth={1.9} aria-hidden />
        </IconButton>
      </div>

      {groups.length === 0 && (
        <div className="surface px-5 py-12 text-center text-[15px] text-ink-secondary">
          {show === "unread" ? "You have read everything." : dates.kind === "all" ? "Nothing needs your attention right now." : "No notifications for these dates."}
        </div>
      )}

      {groups.map((g) => (
        <section key={g.label} aria-labelledby={`notices-${g.label}`}>
          <h2 id={`notices-${g.label}`} className="mb-2 px-1 text-[13px] font-medium text-ink-secondary">
            {g.label}
          </h2>
          <ul className="surface divide-y divide-hairline overflow-hidden">
            {g.items.map((n) => {
              const Icon = icons[n.kind];
              const isUnread = !read.has(n.id);
              const ago = daysAgo(n.date, today);
              return (
                <li key={n.id}>
                  <Link href={n.href} onClick={() => markRead([n.id])} className="flex items-start gap-3 px-4 py-3.5 hover:bg-card-subtle md:px-5">
                    <span className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-full", toneClass[n.tone])}>
                      <Icon size={18} strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-[15px] text-ink", isUnread && "font-semibold")}>
                        {isUnread && <span className="sr-only">Unread: </span>}
                        {n.title}
                      </span>
                      <span className="block text-[13px] leading-[18px] text-ink-secondary">{n.body}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
                      <span className="text-[12px] text-ink-secondary">{ago === 0 ? "Today" : ago === 1 ? "Yesterday" : formatShortDate(n.date)}</span>
                      {isUnread && <span className="size-2.5 rounded-full bg-accent" aria-hidden />}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
