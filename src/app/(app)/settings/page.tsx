import { BellRing, ChevronRight, DatabaseBackup, Landmark, Package, ReceiptText, UserCog, Warehouse } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SampleChip } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Settings" };

const items = [
  { href: "/settings/firm", title: "Firm details", description: "Name, GSTIN, address and phone on bills", icon: Landmark, live: true },
  { href: "/settings/godowns", title: "Godowns", description: "Locations where stock is kept", icon: Warehouse, live: true },
  { href: "/settings/products", title: "Products & rates", description: "Brands, units and list rates", icon: Package, live: true },
  { href: "/settings/users", title: "Users & roles", description: "Who can log in and what they see", icon: UserCog, live: true },
  { href: "/settings", title: "Expense heads", description: "Rent, driver payments, salaries… · editable once the database is connected", icon: ReceiptText, live: false },
  { href: "/settings/reminders", title: "Reminder messages", description: "WhatsApp and SMS messages and when they go", icon: BellRing, live: true },
  { href: "/settings", title: "Backups", description: "Daily backups and restore checks · set up with the database", icon: DatabaseBackup, live: false },
];

export default function SettingsPage() {
  return (
    <div className="animate-fade-up mx-auto max-w-[760px]">
      <PageHeader title="Settings" subtitle="Masters used across the app" actions={<SampleChip />} />
      <ul className="surface divide-y divide-hairline overflow-hidden">
        {items.map((item) => {
          const Icon = item.icon;
          const body = (
            <div className="flex items-center gap-4 px-5 py-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-hairline text-ink-secondary">
                <Icon size={20} strokeWidth={1.75} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block text-[17px]", item.live ? "text-ink" : "text-ink-secondary")}>{item.title}</span>
                <span className="block truncate text-[13px] text-ink-secondary">{item.description}</span>
              </span>
              {item.live && <ChevronRight size={18} strokeWidth={1.75} className="text-ink-tertiary" aria-hidden />}
            </div>
          );
          return <li key={item.title}>{item.live ? <Link href={item.href} className="block hover:bg-card-subtle">{body}</Link> : body}</li>;
        })}
      </ul>
    </div>
  );
}
