"use client";

import { usePathname } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import type { Profile, Role } from "@/lib/data/types";
import type { Notice } from "@/lib/notices";
import { useSignedIn, useViewAs } from "@/lib/roles";
import { InstallPrompt } from "./install-prompt";
import { OfflineBanner } from "./offline-banner";
import { QuickAdd } from "./quick-add";
import { Sidebar } from "./sidebar";
import { TabBar } from "./tab-bar";
import { TopBar } from "./top-bar";

/**
 * Phone (< 768px): frosted top bar + bottom tab bar.
 * Tablet (768–1023px): icon-only sidebar. Desktop (≥ 1024px): full 240px sidebar.
 */
export function AppShell({
  profiles,
  firmName,
  notices,
  children,
}: {
  profiles: Profile[];
  /** Read by Download (components/ui/export-menu) for the top of each file. */
  firmName: string;
  notices: Promise<Notice[]>;
  children: ReactNode;
}) {
  const [role, setRole] = useViewAs();
  const signedIn = useSignedIn();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  // The signed-in person; when the owner previews another role, that role's first person.
  const user = profiles.find((p) => p.id === signedIn?.id && p.role === role) ?? profiles.find((p) => p.role === role) ?? profiles[0];

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-accent text-[15px] font-medium text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      {/* The URL is request data under Cache Components, so the active-item highlight streams in; the fallback is the same nav without it. */}
      <Suspense fallback={<Sidebar pathname="" role={role} firmName={firmName} />}>
        <SidebarForPath role={role} firmName={firmName} />
      </Suspense>
      <div className="md:pl-[72px] lg:pl-60 print:pl-0">
        <TopBar user={user} role={role} canViewAs={(signedIn?.role ?? "owner") === "owner"} notices={notices} onRoleChange={setRole} onQuickAdd={() => setQuickAddOpen(true)} />
        <OfflineBanner />
        <main id="main" data-firm={firmName} tabIndex={-1} className="mx-auto w-full max-w-[1200px] focus:outline-none px-4 pb-32 pt-3 md:px-8 md:pb-16 md:pt-6 print:max-w-none print:p-0">{children}</main>
      </div>
      <Suspense fallback={<TabBar pathname="" role={role} />}>
        <TabBarForPath role={role} />
      </Suspense>
      {quickAddOpen && <QuickAdd role={role} onClose={() => setQuickAddOpen(false)} />}
      <InstallPrompt />
    </div>
  );
}

function SidebarForPath({ role, firmName }: { role: Role; firmName: string }) {
  return <Sidebar pathname={usePathname()} role={role} firmName={firmName} />;
}

function TabBarForPath({ role }: { role: Role }) {
  return <TabBar pathname={usePathname()} role={role} />;
}
