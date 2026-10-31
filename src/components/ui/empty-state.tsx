import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="surface flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-full bg-hairline text-ink-tertiary">
        <Icon size={26} strokeWidth={1.5} aria-hidden />
      </span>
      <h2 className="text-[22px] font-semibold tracking-[-0.3px] text-ink">{title}</h2>
      <p className="mt-2 max-w-md text-[15px] leading-[22px] text-ink-secondary">{children}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
