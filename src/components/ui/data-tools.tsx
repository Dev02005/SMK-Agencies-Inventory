import type { ReactNode } from "react";
import { DateFilterBar } from "@/components/ui/date-filter";
import { ExportMenu } from "@/components/ui/export-menu";
import { cn } from "@/lib/cn";
import type { DatePreset } from "@/lib/date-filter";

/**
 * The row above a list: the date filter (when the list has dates) and Download. The page filters its rows with
 * resolveDateFilter (server) or useDateFilter (browser); Download takes whatever table is then on screen.
 */
export function DataTools({
  title,
  dated = true,
  presets,
  children,
  className,
}: {
  /** Names the downloaded file: "SKA Sales 1 Nov 2026.xlsx". */
  title: string;
  dated?: boolean;
  presets?: DatePreset[];
  /** More filters shown before Download (status chips, search…). */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 print:hidden lg:flex-row lg:items-start lg:justify-between", className)}>
      {dated ? <DateFilterBar presets={presets} /> : <div />}
      <div className="flex shrink-0 flex-wrap items-start gap-2">
        {children}
        <ExportMenu title={title} dated={dated ? (presets ?? true) : undefined} />
      </div>
    </div>
  );
}
