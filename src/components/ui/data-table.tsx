import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Column<T> = {
  key: string;
  /** Leave empty for a chip or icon column; screen readers then hear srHeader (default "Status"). */
  header: string;
  srHeader?: string;
  align?: "right";
  /** e.g. "hidden lg:table-cell" to drop a column on tablets. */
  className?: string;
  cell: (row: T) => ReactNode;
};

export type MobileRow = { title: ReactNode; subtitle?: ReactNode; value?: ReactNode; meta?: ReactNode };

/**
 * One component, two layouts: an iOS-style grouped list on phones and a table from tablet width up.
 * The first column links to the row's page when rowHref is given.
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  rowHref,
  mobile,
  empty = "Nothing here yet.",
  footer,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string | undefined;
  mobile: (row: T) => MobileRow;
  empty?: ReactNode;
  footer?: ReactNode;
}) {
  if (rows.length === 0) {
    return <div className="surface px-5 py-12 text-center text-[15px] text-ink-secondary">{empty}</div>;
  }

  return (
    <>
      <ul className="surface divide-y divide-hairline overflow-hidden md:hidden">
        {rows.map((row) => {
          const m = mobile(row);
          const href = rowHref?.(row);
          const content = (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] text-ink">{m.title}</div>
                {m.subtitle && <div className="truncate text-[13px] text-ink-secondary">{m.subtitle}</div>}
              </div>
              {(m.value || m.meta) && (
                <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                  {m.value && <div className="text-[15px] font-medium tabular-nums text-ink">{m.value}</div>}
                  {m.meta}
                </div>
              )}
              {href && <ChevronRight size={18} strokeWidth={1.75} className="shrink-0 text-ink-tertiary" aria-hidden />}
            </div>
          );
          return (
            <li key={rowKey(row)}>
              {href ? (
                <Link href={href} className="block active:bg-card-subtle">
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>

      {/* Rows without links leave nothing to tab to, so the wrapper itself takes focus for sideways scrolling. */}
      <div className="surface hidden overflow-x-auto md:block" tabIndex={rowHref ? undefined : 0}>
        <table className="w-full text-[15px]">
          <thead>
            <tr className="border-b border-hairline bg-[#f2f7fd]">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-left text-[12px] font-medium text-[#3d5a80] first:pl-6 last:pr-6",
                    c.align === "right" && "text-right",
                    c.className,
                  )}
                >
                  {c.header || <span className="sr-only">{c.srHeader ?? "Status"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {rows.map((row) => {
              const href = rowHref?.(row);
              return (
                <tr key={rowKey(row)} className="h-12 hover:bg-card-subtle">
                  {columns.map((c, i) => (
                    <td
                      key={c.key}
                      className={cn(
                        "px-4 py-2.5 align-middle first:pl-6 last:pr-6",
                        c.align === "right" && "text-right tabular-nums",
                        c.className,
                      )}
                    >
                      {i === 0 && href ? (
                        <Link href={href} className="font-medium text-ink hover:text-link hover:underline">
                          {c.cell(row)}
                        </Link>
                      ) : (
                        c.cell(row)
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
          {footer && <tfoot className="border-t border-hairline">{footer}</tfoot>}
        </table>
      </div>
    </>
  );
}
