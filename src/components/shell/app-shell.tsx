"use client";

import { usePathname } from "next/navigation";
import { Suspense, use, useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Profile, Role } from "@/lib/data/types";
import type { Notice } from "@/lib/notices";
import { useSignedIn, useViewAs } from "@/lib/roles";
import { InstallPrompt } from "./install-prompt";
import { NotesBall } from "./notes-ball";
import { OfflineBanner } from "./offline-banner";
import { QuickAdd } from "./quick-add";
import { Sidebar } from "./sidebar";
import { TabBar } from "./tab-bar";
import { TopBar } from "./top-bar";

/**
 * Phone (< 768px): frosted top bar + bottom tab bar.
 * Tablet (768–1023px): icon-only sidebar. Desktop (≥ 1024px): full or collapsible sidebar.
 */
export function AppShell({
  people,
  firmName,
  notices,
  children,
}: {
  /** Everyone for the owner, only the signed-in person for anyone else. */
  people: Promise<Profile[]>;
  /** Read by Download (components/ui/export-menu) for the top of each file. */
  firmName: string;
  notices: Promise<Notice[]>;
  children: ReactNode;
}) {
  const [role] = useViewAs();
  const signedIn = useSignedIn();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ska_sidebar_collapsed");
      if (saved !== null) setSidebarCollapsed(saved === "true");
    } catch {}
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("ska_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  }

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-accent text-[15px] font-medium text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      {/* The URL is request data under Cache Components, so the active-item highlight streams in; the fallback is the same nav without it. */}
      <Suspense fallback={<Sidebar pathname="" role={role} firmName={firmName} collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />}>
        <SidebarForPath role={role} firmName={firmName} collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
      </Suspense>
      <div className={cn("transition-all duration-200 print:pl-0", sidebarCollapsed ? "md:pl-[72px]" : "md:pl-[72px] lg:pl-64")}>
        <Suspense fallback={<div className="frosted sticky top-0 z-30 h-14 border-b border-black/[0.05] pt-[env(safe-area-inset-top)] print:hidden" />}>
          <TopBarFor
            people={people}
            role={role}
            signedInId={signedIn?.id}
            notices={notices}
            onQuickAdd={() => setQuickAddOpen(true)}
          />
        </Suspense>
        <OfflineBanner />
        <main id="main" data-firm={firmName} tabIndex={-1} className="mx-auto w-full max-w-[1200px] focus:outline-none px-4 pb-32 pt-3 md:px-8 md:pb-16 md:pt-6 print:max-w-none print:p-0">{children}</main>
      </div>
      <Suspense fallback={<TabBar pathname="" role={role} />}>
        <TabBarForPath role={role} />
      </Suspense>
      {quickAddOpen && <QuickAdd role={role} onClose={() => setQuickAddOpen(false)} />}
      <NotesBall role={role} />
      <InstallPrompt />
    </div>
  );
}

/** The top bar for the signed-in person. */
function TopBarFor({
  people,
  role,
  signedInId,
  ...rest
}: {
  people: Promise<Profile[]>;
  role: Role;
  signedInId?: string;
  notices: Promise<Notice[]>;
  onQuickAdd: () => void;
}) {
  const profiles = use(people);
  const user = profiles.find((p) => p.id === signedInId && p.role === role) ?? profiles.find((p) => p.role === role) ?? profiles[0];
  return <TopBar user={user} role={role} {...rest} />;
}

function SidebarForPath({
  role,
  firmName,
  collapsed,
  onToggleCollapse,
}: {
  role: Role;
  firmName: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <Sidebar
      pathname={usePathname()}
      role={role}
      firmName={firmName}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
    />
  );
}

function TabBarForPath({ role }: { role: Role }) {
  return <TabBar pathname={usePathname()} role={role} />;
}
