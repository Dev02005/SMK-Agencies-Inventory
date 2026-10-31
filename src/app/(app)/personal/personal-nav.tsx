"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { lockPersonal } from "./actions";

const tabs = [
  { href: "/personal", label: "Overview" },
  { href: "/personal/chits", label: "Chits" },
  { href: "/personal/rents", label: "Rents" },
  { href: "/personal/insurance", label: "Insurance" },
  { href: "/personal/banks", label: "Banks" },
  { href: "/personal/notes", label: "Notes" },
  { href: "/personal/documents", label: "Documents" },
];

export function PersonalNav() {
  const pathname = usePathname();
  return (
    <div className="mb-5 flex items-center gap-2">
      <nav aria-label="Personal" className="no-scrollbar -mx-4 flex flex-1 gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-9 shrink-0 items-center rounded-full px-4 text-[14px] transition-colors",
                active ? "bg-purple/10 font-medium text-purple" : "border border-hairline bg-card text-ink-secondary hover:text-ink",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={() => void lockPersonal()}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-hairline px-3 text-[14px] text-ink-secondary hover:text-ink"
      >
        <Lock size={15} strokeWidth={1.75} aria-hidden /> Lock
      </button>
    </div>
  );
}
