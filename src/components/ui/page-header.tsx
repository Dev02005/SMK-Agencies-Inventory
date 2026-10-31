import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  back?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 md:mb-7">
      <div className="min-w-0">
        {back}
        <h1 className="text-[34px] font-semibold leading-[41px] tracking-[-0.4px] text-ink">{title}</h1>
        {subtitle && <div className="mt-1 text-[15px] text-ink-secondary">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
