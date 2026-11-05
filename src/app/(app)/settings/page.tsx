import { BellRing, ChevronRight, CircleUserRound, DatabaseBackup, Landmark, MapPin, Package, ReceiptText, UserCog, Warehouse } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SampleChip } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { RoleGuard } from "@/components/ui/sub-nav";
import { cn } from "@/lib/cn";
import { toneClasses, type Tone } from "@/lib/sections";
import { InstallRow } from "./install-row";

export const metadata: Metadata = { title: "Settings" };

type Item = { href: string; title: string; description: string; icon: typeof Landmark; live: boolean; tone: Tone; ownerOnly?: boolean };

const masters: Item[] = [
  { href: "/settings/firm", title: "Firm details", description: "Both firms: name, GSTIN, address and phone on bills", icon: Landmark, live: true, tone: "purple" },
  { href: "/settings/godowns", title: "Godowns", description: "Locations where stock is kept", icon: Warehouse, live: true, tone: "amber" },
  { href: "/settings/products", title: "Products", description: "Brands, types and units", icon: Package, live: true, tone: "teal" },
  { href: "/settings/lists", title: "Destinations & rent drivers", description: "The lists offered on New sale: add or delete", icon: MapPin, live: true, tone: "green" },
  { href: "/settings/users", title: "Users & roles", description: "Who can log in and what they see", icon: UserCog, live: true, tone: "blue", ownerOnly: true },
  { href: "/settings", title: "Expense heads", description: "Rent, driver payments, salaries… · editable once the database is connected", icon: ReceiptText, live: false, tone: "grey" },
  { href: "/settings/reminders", title: "Reminder messages", description: "WhatsApp and SMS messages and when they go", icon: BellRing, live: true, tone: "green" },
  { href: "/settings", title: "Backups", description: "Daily backups and restore checks · set up with the database", icon: DatabaseBackup, live: false, tone: "grey" },
];

function ItemRow({ item }: { item: Item }) {
  const Icon = item.icon;
  const body = (
    <div className="flex items-center gap-4 px-5 py-4">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", toneClasses[item.tone])}>
        <Icon size={20} strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[17px]", item.live ? "text-ink" : "text-ink-secondary")}>{item.title}</span>
        <span className="block truncate text-[13px] text-ink-secondary">{item.description}</span>
      </span>
      {item.live && <ChevronRight size={18} strokeWidth={1.75} className="text-ink-tertiary" aria-hidden />}
    </div>
  );
  return <li>{item.live ? <Link href={item.href} className="block hover:bg-card-subtle">{body}</Link> : body}</li>;
}

/** Everyone gets their own account and installing the app; the owner and office also get the masters. */
export default function SettingsPage() {
  return (
    <div className="animate-fade-up mx-auto max-w-[760px]">
      <PageHeader title="Settings" subtitle="Your account, this device and the masters used across the app" actions={<SampleChip />} />
      <h2 className="mb-2 px-1 text-[13px] font-medium text-ink-secondary">You and this device</h2>
      <ul className="surface divide-y divide-hairline overflow-hidden">
        <ItemRow
          item={{ href: "/settings/account", title: "Account", description: "Your name, photo, sign-in and automatic sign-out", icon: CircleUserRound, live: true, tone: "blue" }}
        />
        <li>
          <InstallRow />
        </li>
      </ul>
      <RoleGuard roles={["owner", "office"]} fallback={<></>}>
        <h2 className="mb-2 mt-6 px-1 text-[13px] font-medium text-ink-secondary">Masters</h2>
        <ul className="surface divide-y divide-hairline overflow-hidden">
          {masters.map((item) =>
            item.ownerOnly ? (
              <RoleGuard key={item.title} roles={["owner"]} fallback={<></>}>
                <ItemRow item={item} />
              </RoleGuard>
            ) : (
              <ItemRow key={item.title} item={item} />
            ),
          )}
        </ul>
      </RoleGuard>
    </div>
  );
}
