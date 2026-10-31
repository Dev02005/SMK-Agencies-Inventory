"use client";

import { Check, Download, LogOut } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { Profile, Role } from "@/lib/data/types";
import { promptInstall, useInstall } from "@/lib/install";
import { allRoles, roleLabels } from "@/lib/roles";

export function ProfileMenu({
  user,
  role,
  onRoleChange,
}: {
  user: Profile;
  role: Role;
  onRoleChange: (role: Role) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const install = useInstall();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${user.fullName}, ${roleLabels[role]}`}
        className="grid size-9 place-items-center rounded-full bg-hairline text-[13px] font-semibold text-ink-secondary hover:bg-divider"
      >
        {user.initials}
      </button>
      {open && (
        <div role="menu" className="surface animate-fade-up absolute right-0 top-11 z-40 w-72 p-2">
          <div className="px-3 pb-3 pt-2">
            <p className="text-[15px] font-semibold text-ink">{user.fullName}</p>
            <p className="text-[13px] text-ink-secondary">{roleLabels[role]}</p>
          </div>
          <div className="border-t border-hairline px-3 pb-1 pt-3 text-[12px] text-ink-tertiary">
            View as (sample mode)
          </div>
          {allRoles.map((r) => (
            <button
              key={r}
              type="button"
              role="menuitemradio"
              aria-checked={r === role}
              onClick={() => {
                onRoleChange(r);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[15px] hover:bg-card-subtle",
                r === role ? "font-medium text-ink" : "text-ink-secondary",
              )}
            >
              {roleLabels[r]}
              {r === role && <Check size={16} strokeWidth={2.25} className="text-accent" aria-hidden />}
            </button>
          ))}
          <div className="mt-1 border-t border-hairline pt-1">
            {install.kind === "prompt" && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  void promptInstall();
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[15px] text-ink-secondary hover:bg-card-subtle"
              >
                <Download size={16} strokeWidth={1.75} aria-hidden />
                Install app
              </button>
            )}
            <Link
              href="/login"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-[15px] text-ink-secondary hover:bg-card-subtle"
            >
              <LogOut size={16} strokeWidth={1.75} aria-hidden />
              Sign out
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
