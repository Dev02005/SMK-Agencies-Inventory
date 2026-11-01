/**
 * A table that is never shown, only read by Download (components/ui/export-menu), for pages that show cards
 * instead of a table. Give cells as the app shows them ("₹53,250", "1 Nov 2026") so Excel gets numbers and dates.
 */
export function ExportTable({ title, columns, rows }: { title?: string; columns: string[]; rows: (string | number | undefined)[][] }) {
  return (
    <table hidden aria-hidden>
      {title && <caption>{title}</caption>}
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((value, j) => (
              <td key={j}>{value}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
