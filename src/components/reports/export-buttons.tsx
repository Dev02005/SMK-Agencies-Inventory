"use client";

import { FileSpreadsheet, Printer } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { ReportColumn, ReportRow } from "@/lib/reports";
import type { Cell, SheetData } from "write-excel-file/browser";

type Props = {
  firmName: string;
  title: string;
  periodLabel: string;
  fileName: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  totals?: ReportRow;
  wide: boolean;
};

const formats = { inr: '"₹"#,##0.00', number: "#,##0.##" } as const;

/** Excel builds a real .xlsx in the browser (numbers stay numbers); PDF uses the print dialog's "Save as PDF". */
export function ExportButtons({ firmName, title, periodLabel, fileName, columns, rows, totals, wide }: Props) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function downloadExcel() {
    setBusy(true);
    try {
      const { default: writeExcelFile } = await import("write-excel-file/browser");
      const cell = (c: ReportColumn, v: ReportRow[string], bold = false): Cell => {
        if (v === undefined || v === "") return null;
        const weight = bold ? ({ fontWeight: "bold" } as const) : {};
        if (c.kind === "date" && typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
          return { value: new Date(`${v}T00:00:00Z`), type: Date, format: "dd mmm yyyy", ...weight };
        }
        if ((c.kind === "inr" || c.kind === "number") && typeof v === "number") {
          return { value: v, type: Number, format: formats[c.kind], ...weight };
        }
        return { value: String(v), ...weight };
      };
      const blank: Cell[] = columns.map(() => null);
      const data: SheetData = [
        [{ value: firmName, fontWeight: "bold", fontSize: 14 }, ...blank.slice(1)],
        [{ value: `${title} · ${periodLabel}` }, ...blank.slice(1)],
        blank,
        columns.map((c): Cell => ({ value: c.label, fontWeight: "bold", align: c.kind === "inr" || c.kind === "number" ? "right" : "left" })),
        ...rows.map((r) => columns.map((c) => cell(c, r[c.key]))),
        ...(totals ? [columns.map((c) => cell(c, totals[c.key], true))] : []),
      ];
      const widths = columns.map((c) => ({
        width: Math.min(40, Math.max(c.label.length + 2, c.kind === "date" ? 13 : c.kind === "inr" ? 14 : 10, ...rows.slice(0, 200).map((r) => String(r[c.key] ?? "").length + 2))),
      }));
      await writeExcelFile(data, { columns: widths, sheet: title.slice(0, 31), stickyRowsCount: 4, ...(wide ? { orientation: "landscape" as const } : {}) }).toFile(`${fileName}.xlsx`);
      toast(`${fileName}.xlsx downloaded`);
    } catch {
      toast("Could not make the Excel file. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={downloadExcel} disabled={busy}>
        <FileSpreadsheet size={18} strokeWidth={1.75} aria-hidden />
        {busy ? "Making…" : "Excel"}
      </Button>
      <Button variant="secondary" onClick={() => window.print()}>
        <Printer size={18} strokeWidth={1.75} aria-hidden />
        PDF / Print
      </Button>
    </>
  );
}
