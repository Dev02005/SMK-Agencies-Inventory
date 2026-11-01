import type { Cell, SheetData } from "write-excel-file/browser";
import type { ExportColumn, ExportDoc, ExportValue } from "./table";

const formats = { inr: '"₹"#,##0.00', number: "#,##0.##" } as const;

function cell(column: ExportColumn | undefined, value: ExportValue, bold = false): Cell {
  if (value === undefined || value === "") return null;
  const weight = bold ? ({ fontWeight: "bold" } as const) : {};
  if (column?.kind === "date" && typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { value: new Date(`${value}T00:00:00Z`), type: Date, format: "dd mmm yyyy", ...weight };
  }
  if ((column?.kind === "inr" || column?.kind === "number") && typeof value === "number") {
    return { value, type: Number, format: formats[column.kind], ...weight };
  }
  return { value: String(value), ...weight };
}

/** A real .xlsx built in the browser: firm and title on top, then each table with its totals; numbers stay numbers. */
export async function excelFile(doc: ExportDoc): Promise<Blob> {
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  const width = Math.max(1, ...doc.tables.map((t) => t.columns.length));
  const pad = (cells: Cell[]) => [...cells, ...Array<Cell>(Math.max(0, width - cells.length)).fill(null)];
  const many = doc.tables.length > 1;

  const data: SheetData = [
    pad([{ value: doc.firmName, fontWeight: "bold", fontSize: 14 }]),
    pad([{ value: [doc.title, doc.subtitle].filter(Boolean).join(" · ") }]),
    pad([]),
  ];
  for (const table of doc.tables) {
    if (many && table.title) data.push(pad([{ value: table.title, fontWeight: "bold" }]));
    data.push(pad(table.columns.map((c): Cell => ({ value: c.label, fontWeight: "bold", align: c.kind === "inr" || c.kind === "number" ? "right" : "left" }))));
    for (const row of table.rows) data.push(pad(row.map((v, i) => cell(table.columns[i], v))));
    for (const row of table.totals ?? []) data.push(pad(row.map((v, i) => cell(table.columns[i], v, true))));
    if (many) data.push(pad([]));
  }

  const columns = Array.from({ length: width }, (_, i) => ({
    width: Math.min(
      40,
      Math.max(
        10,
        ...doc.tables.map((t) => (t.columns[i]?.label.length ?? 0) + 2),
        ...doc.tables.flatMap((t) => t.rows.slice(0, 200).map((r) => String(r[i] ?? "").length + 2)),
      ),
    ),
  }));
  const sheet = doc.title.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Sheet1";
  return writeExcelFile(data, { columns, sheet, ...(many ? {} : { stickyRowsCount: 4 }), ...(width >= 8 ? { orientation: "landscape" as const } : {}) }).toBlob();
}
