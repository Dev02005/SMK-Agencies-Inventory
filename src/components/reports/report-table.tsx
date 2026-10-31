import { cn } from "@/lib/cn";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import type { ReportColumn, ReportResult, ReportRow } from "@/lib/reports";

const numeric = (c: ReportColumn) => c.kind === "inr" || c.kind === "number";

function show(c: ReportColumn, v: ReportRow[string]) {
  if (v === undefined || v === "") return "";
  if (c.kind === "inr" && typeof v === "number") return v === 0 ? "–" : formatINR(v);
  if (c.kind === "number" && typeof v === "number") return formatNumber(v);
  if (c.kind === "date" && typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return formatDate(v);
  return String(v);
}

/**
 * Report rows: a full table on tablets, desktops and paper; on phones each row is a card with its
 * name, the text details, the main figure and the other non-zero figures underneath, so nothing is cut off.
 */
export function ReportTable({ result }: { result: ReportResult }) {
  const { columns, rows, totals } = result;
  if (rows.length === 0) {
    return <div className="surface px-5 py-12 text-center text-[15px] text-ink-secondary">Nothing in this period.</div>;
  }
  const [first, ...rest] = columns;
  const texts = rest.filter((c) => !numeric(c));
  const nums = rest.filter(numeric);
  const main = nums.at(-1);

  const phoneCard = (r: ReportRow, key: string, isTotal = false) => {
    const others = nums.filter((c) => c !== main && typeof r[c.key] === "number" && r[c.key] !== 0);
    return (
      <li key={key} className={cn("px-4 py-3", isTotal && "bg-card-subtle")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={cn("text-[15px] text-ink", isTotal && "font-semibold")}>{show(first, r[first.key])}</p>
            {!isTotal && texts.some((c) => r[c.key]) && (
              <p className="text-[13px] text-ink-secondary">{texts.map((c) => show(c, r[c.key])).filter(Boolean).join(" · ")}</p>
            )}
          </div>
          {main && r[main.key] !== undefined && (
            <p className={cn("shrink-0 text-right text-[15px] tabular-nums text-ink", isTotal ? "font-semibold" : "font-medium")}>
              {show(main, r[main.key])}
            </p>
          )}
        </div>
        {others.length > 0 && (
          <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[13px]">
            {others.map((c) => (
              <div key={c.key} className="flex gap-1.5">
                <dt className="text-ink-secondary">{c.label}</dt>
                <dd className="tabular-nums text-ink">{show(c, r[c.key])}</dd>
              </div>
            ))}
          </dl>
        )}
      </li>
    );
  };

  return (
    <>
      <ul className="surface divide-y divide-hairline overflow-hidden md:hidden print:hidden">
        {rows.map((r, i) => phoneCard(r, String(i)))}
        {totals && phoneCard(totals, "total", true)}
      </ul>

      {/* Focusable so a wide report can be scrolled sideways with the keyboard. */}
      <div
        role="region"
        aria-label="Report table"
        tabIndex={0}
        className="surface hidden overflow-x-auto md:block print:block print:overflow-visible print:rounded-none print:border-0 print:shadow-none"
      >
        <table className="w-full text-[14px] print:text-[11px]">
          <thead>
            <tr className="border-b border-hairline print:border-[#d2d2d7]">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    "whitespace-nowrap px-3 py-3 text-left text-[12px] font-normal text-ink-secondary first:pl-6 last:pr-6 print:px-1.5 print:py-1.5 print:text-[10px] print:first:pl-0 print:last:pr-0",
                    numeric(c) && "text-right",
                  )}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {rows.map((r, i) => (
              <tr key={i} className="break-inside-avoid hover:bg-card-subtle">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-3 py-2.5 align-top first:pl-6 last:pr-6 print:px-1.5 print:py-1 print:first:pl-0 print:last:pr-0",
                      numeric(c) ? "whitespace-nowrap text-right tabular-nums" : c.kind === "date" ? "whitespace-nowrap text-ink-secondary" : "",
                      c === first && "text-ink",
                    )}
                  >
                    {show(c, r[c.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {totals && (
            <tfoot className="border-t-2 border-divider">
              <tr className="font-semibold">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-3 py-3 first:pl-6 last:pr-6 print:px-1.5 print:py-1.5 print:first:pl-0 print:last:pr-0",
                      numeric(c) && "whitespace-nowrap text-right tabular-nums",
                    )}
                  >
                    {show(c, totals[c.key])}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  );
}
