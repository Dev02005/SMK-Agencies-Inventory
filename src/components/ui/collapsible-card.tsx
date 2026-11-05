import { ChevronDown, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A card that shows only its title, like a button, until it is opened; tapping the title again closes it. Built on
 * <details>, so it works before the page's scripts load and with the keyboard.
 */
export function CollapsibleCard({ title, hint, icon: Icon, children }: { title: string; hint?: string; icon?: LucideIcon; children: ReactNode }) {
  return (
    <details className="surface group overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 hover:bg-card-subtle md:px-6 [&::-webkit-details-marker]:hidden">
        {Icon && (
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
            <Icon size={18} strokeWidth={1.9} aria-hidden />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold tracking-[-0.3px] text-ink">{title}</span>
          {hint && <span className="block text-[13px] text-ink-secondary">{hint}</span>}
        </span>
        <ChevronDown size={20} strokeWidth={1.9} className="shrink-0 text-ink-secondary transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-hairline px-5 pb-5 pt-4 md:px-6 md:pb-6">{children}</div>
    </details>
  );
}
