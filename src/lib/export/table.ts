import { formatDate, formatINR, formatNumber } from "@/lib/format";

/**
 * What a download holds: one or more tables under the firm's name, a title and a subtitle (usually the dates).
 * Dates are "YYYY-MM-DD"; rupee and number cells are numbers, so Excel can add them up.
 */
export type ExportKind = "text" | "inr" | "number" | "date";
export type ExportValue = string | number | undefined;
export type ExportColumn = { label: string; kind?: ExportKind };
export type TableData = { title?: string; columns: ExportColumn[]; rows: ExportValue[][]; totals?: ExportValue[][] };
export type ExportDoc = { firmName: string; title: string; subtitle: string; tables: TableData[] };

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const rupees = /^([-−])?\s*₹\s*(\d[\d,]*(?:\.\d+)?)$/;
const plainNumber = /^-?(?:\d{1,3}(?:,\d{2,3})+|\d{1,7})(?:\.\d+)?$/;
const shownDate = /^(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})$/;

function toNumber(text: string) {
  return Number(text.replace(/,/g, ""));
}

function parseRupees(text: string) {
  const m = rupees.exec(text);
  return m ? (m[1] ? -1 : 1) * toNumber(m[2]) : undefined;
}

function parseShownDate(text: string) {
  const m = shownDate.exec(text);
  const month = m ? months.indexOf(m[2]) : -1;
  return m && month >= 0 ? `${m[3]}-${String(month + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}` : undefined;
}

function kindOf(values: string[]): ExportKind {
  if (values.length === 0) return "text";
  if (values.every((v) => parseRupees(v) !== undefined)) return "inr";
  if (values.every((v) => plainNumber.test(v))) return "number";
  if (values.every((v) => parseShownDate(v) !== undefined)) return "date";
  return "text";
}

function typed(text: string, kind: ExportKind): ExportValue {
  if (!text) return undefined;
  if (kind === "inr") return parseRupees(text) ?? text;
  if (kind === "number") return plainNumber.test(text) ? toNumber(text) : text;
  if (kind === "date") return parseShownDate(text) ?? text;
  return text;
}

const textOf = (el: Element) => (el.textContent ?? "").replace(/\s+/g, " ").trim();

/** A row's cells, with a cell spanning several columns followed by blanks so columns stay lined up. */
function cellsOf(row: HTMLTableRowElement) {
  const out: string[] = [];
  for (const cell of row.cells) {
    out.push(textOf(cell));
    for (let i = 1; i < cell.colSpan; i++) out.push("");
  }
  return out;
}

/** The nearest heading above a table ("Day by day", "Entries"…), used when a page has more than one. */
function titleOf(table: HTMLTableElement) {
  const caption = table.caption ? textOf(table.caption) : "";
  if (caption) return caption;
  let el: Element | null = table;
  for (let depth = 0; el && el.id !== "main" && depth < 6; depth++) {
    for (let sibling = el.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
      const heading = sibling.matches("h2, h3") ? sibling : sibling.querySelector("h2, h3");
      if (heading) return textOf(heading);
    }
    el = el.parentElement;
  }
  return undefined;
}

function readTable(table: HTMLTableElement): TableData {
  const head = table.tHead?.rows[0];
  const body = [...table.tBodies].flatMap((b) => [...b.rows]).map(cellsOf);
  const foot = table.tFoot ? [...table.tFoot.rows].map(cellsOf) : [];
  const width = Math.max(head ? cellsOf(head).length : 0, ...body.map((r) => r.length), 0);
  const labels = head ? cellsOf(head) : [];
  const keep = Array.from({ length: width }, (_, i) => i).filter((i) => labels[i] || body.some((r) => r[i]) || foot.some((r) => r[i]));
  const kinds = keep.map((i) => kindOf(body.map((r) => r[i] ?? "").filter(Boolean)));
  const pick = (row: string[]) => keep.map((i, k) => typed(row[i] ?? "", kinds[k]));
  return {
    title: titleOf(table),
    columns: keep.map((i, k) => ({ label: labels[i] ?? "", kind: kinds[k] })),
    rows: body.map(pick),
    totals: foot.map(pick),
  };
}

/** Every table on the page as it is shown now (filters applied), including columns hidden on small screens. */
export function tablesOnPage(): TableData[] {
  const main = document.getElementById("main") ?? document.body;
  return [...main.querySelectorAll("table")]
    .filter((t) => !t.closest("[data-export-skip]"))
    .map(readTable)
    .filter((t) => t.rows.length > 0);
}

/** A cell as text, the way the app shows it. */
export function shownValue(value: ExportValue, kind: ExportKind = "text") {
  if (value === undefined || value === "") return "";
  if (typeof value === "number") return kind === "inr" ? formatINR(value) : formatNumber(value);
  if (kind === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value);
  return value;
}

/** "SKA Sales 1 Nov 2026" with characters file systems dislike removed. */
export function fileNameFor(doc: Pick<ExportDoc, "title" | "subtitle">) {
  return `SKA ${doc.title} ${doc.subtitle}`.replace(/ – /g, " to ").replace(/[^\w ,-]+/g, " ").replace(/\s+/g, " ").trim();
}
