/**
 * Reads the transactions table out of an Indian bank statement PDF, from the text pieces and their positions on
 * the page (lib/statement-pdf.ts extracts them in the browser). Works from the column headings rather than any
 * one bank's wording, so SBI, HDFC, Union Bank, APGB, KVB and similar layouts all read the same way:
 *
 * 1. find the heading row (Date … Debit/Withdrawal … Credit/Deposit … Balance) and where each column sits;
 * 2. below it, a line that starts with a date begins a transaction; following lines add to its description;
 * 3. each amount goes to the column whose heading it lines up under;
 * 4. every row is checked against the running balance: previous + credit − debit must equal the printed balance.
 *    A row whose amount landed in the wrong column is corrected; anything else is flagged for the person to look at.
 */

export type StatementItem = { str: string; x: number; y: number; w: number };

export type StatementRow = {
  date: string;
  description: string;
  ref?: string;
  debit: number;
  credit: number;
  balance?: number;
  /** ok = matches the running balance; fixed = matched after moving the amount to the other column. */
  check: "ok" | "fixed" | "mismatch" | "unknown";
};

export type ParsedStatement = {
  bank?: string;
  accountNo?: string;
  ifsc?: string;
  from?: string;
  to?: string;
  openingBalance?: number;
  closingBalance?: number;
  rows: StatementRow[];
};

type Line = { y: number; items: StatementItem[]; text: string };
type Column = { key: "date" | "desc" | "ref" | "debit" | "credit" | "amount" | "balance" | "other"; left: number; right: number };

const AMOUNT = /^\(?-?[\d,]*\d\.\d{2}\)?(?:\s*(?:Cr|Dr)\.?)?$/i;
const TIME = /^\d{1,2}:\d{2}(?::\d{2})?$/;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
// Lines that end the table on a page: totals, page numbers, legends and footers.
const STOP =
  /^(grand total|total\b|page\b|page no|legend|closing balance|opening balance|statement summary|summary of|\*+|important|this is (a )?(system|computer)|customers are|registered office|for any queries|to avail|unless the|abbreviations|notes?\s*:|end of statement|hdfc bank limited|state account branch)/i;

// Bank from the IFSC prefix. APGB is sponsored by Union Bank, so its codes start UBIN0CG and are checked first.
const BANKS: [RegExp, string][] = [
  [/^UBIN0CG/, "Andhra Pradesh Grameena Bank"],
  [/^SBIN/, "State Bank of India"],
  [/^HDFC/, "HDFC Bank"],
  [/^UBIN/, "Union Bank of India"],
  [/^KVBL/, "Karur Vysya Bank"],
  [/^BARB/, "Bank of Baroda"],
  [/^ICIC/, "ICICI Bank"],
  [/^UTIB/, "Axis Bank"],
  [/^CNRB/, "Canara Bank"],
  [/^PUNB/, "Punjab National Bank"],
  [/^IDIB/, "Indian Bank"],
  [/^IOBA/, "Indian Overseas Bank"],
  [/^KKBK/, "Kotak Mahindra Bank"],
  [/^IDFB/, "IDFC First Bank"],
  [/^YESB/, "Yes Bank"],
  [/^BKID/, "Bank of India"],
  [/^MAHB/, "Bank of Maharashtra"],
  [/^CBIN/, "Central Bank of India"],
  [/^UCBA/, "UCO Bank"],
  [/^FDRL/, "Federal Bank"],
];

/** Bank names for pickers, in the order of the list above. */
export const BANK_NAMES = [...new Set(BANKS.map(([, name]) => name))];

export function bankFromIfsc(ifsc: string) {
  return BANKS.find(([re]) => re.test(ifsc.toUpperCase()))?.[1];
}

/** "23/10/2026", "25/04/25", "01-10-2026 10:32:57", "23 Oct 2026", "23-Oct-26" → "2026-10-23". */
function toISODate(text: string): string | undefined {
  const s = text.trim();
  let d: number, m: number, y: number;
  const numeric = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})\b/.exec(s);
  const named = /^(\d{1,2})[\s-]([A-Za-z]{3})[a-z]*[\s,-]+(\d{2}|\d{4})\b/.exec(s);
  if (numeric) [d, m, y] = [Number(numeric[1]), Number(numeric[2]), Number(numeric[3])];
  else if (named && MONTHS.includes(named[2].toLowerCase())) [d, m, y] = [Number(named[1]), MONTHS.indexOf(named[2].toLowerCase()) + 1, Number(named[3])];
  else return undefined;
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31) return undefined;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** "2,50,000.00" → 250000, "-64,85,460.90" → -6485460.9, "(500.00)" or "500.00 Dr" → -500 (when signed). */
function toAmount(text: string, signed: boolean): number {
  const s = text.trim();
  const negative = s.startsWith("-") || s.startsWith("(") || (signed && /dr\.?$/i.test(s));
  const value = Number(s.replace(/[^\d.]/g, ""));
  return negative ? -value : value;
}

function toLines(items: StatementItem[]): Line[] {
  const lines: Line[] = [];
  for (const item of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const line = lines.find((l) => Math.abs(l.y - item.y) <= 2.5);
    if (line) line.items.push(item);
    else lines.push({ y: item.y, items: [item], text: "" });
  }
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
    line.text = line.items.map((i) => i.str.trim()).join(" ");
  }
  return lines.sort((a, b) => b.y - a.y);
}

/** The heading row and the column positions it gives, or undefined if this line is not a heading. */
function readHeading(line: Line): Column[] | undefined {
  const t = line.text.toLowerCase();
  const hasBalance = /balance/.test(t);
  const hasSides = /(debit|withdraw|dr\b)/.test(t) && /(credit|deposit|cr\b)/.test(t);
  const hasAmount = /\bamount\b/.test(t);
  if (!hasBalance || !(hasSides || hasAmount) || !/date/.test(t)) return undefined;
  const columns: Column[] = [];
  for (const it of line.items) {
    const s = it.str.toLowerCase();
    const col = { left: it.x, right: it.x + it.w };
    if (/balance/.test(s)) columns.push({ key: "balance", ...col });
    else if (/debit|withdraw/.test(s) || /^dr\.?$/.test(s)) columns.push({ key: "debit", ...col });
    else if (/credit|deposit/.test(s) || /^cr\.?$/.test(s)) columns.push({ key: "credit", ...col });
    else if (/\bamount\b/.test(s)) columns.push({ key: "amount", ...col });
    else if (/date|txn/.test(s) && !columns.some((c) => c.key === "date")) columns.push({ key: "date", ...col });
    else if (/description|narration|particulars|remarks|details/.test(s)) columns.push({ key: "desc", ...col });
    else if (/ref|chq|cheque|utr|instr|\bid\b/.test(s)) columns.push({ key: "ref", ...col });
    // Value date, branch code and similar: kept so the columns either side know where they end.
    else columns.push({ key: "other", ...col });
  }
  return columns.some((c) => c.key === "balance") ? columns : undefined;
}

/** Account details come from the part above the table, so codes inside transactions (other banks' IFSCs) can't mislead. */
function findMeta(head: string, text: string) {
  const ifsc = /IFSC?(?:\s*Code)?\s*[:-]?\s*([A-Z]{4}0[A-Z0-9]{6})\b/i.exec(head)?.[1] ?? /\b([A-Z]{4}0[A-Z0-9]{6})\b/.exec(head)?.[1];
  const accountNo = /account\s*(?:no\.?|number)\s*[:-]?\s*([0-9Xx*]{6,20})/i.exec(head)?.[1];
  const bank = /grameena|\bAPGB/i.test(head) ? "Andhra Pradesh Grameena Bank" : ifsc ? BANKS.find(([re]) => re.test(ifsc))?.[1] : undefined;
  const DATE = String.raw`(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{1,2}[\s-][A-Za-z]{3}[a-z]*[\s,-]+\d{2,4})`;
  const periodRe = new RegExp(String.raw`(?:from|period)(?:\s*date)?\s*:?\s*-?\s*${DATE}[\s\S]{0,40}?\bto(?:\s*date)?\s*:?\s*-?\s*${DATE}`, "i");
  const period = periodRe.exec(head) ?? periodRe.exec(text);
  const money = (label: string) => {
    const re = new RegExp(String.raw`${label}[^\n]*?(-?[\d,]*\d\.\d{2})(\s*(?:cr|dr))?`, "i");
    const hit = re.exec(head) ?? re.exec(text);
    return hit ? toAmount(hit[1] + (hit[2] ?? ""), true) : undefined;
  };
  return {
    bank,
    ifsc,
    accountNo,
    from: period ? toISODate(period[1]) : undefined,
    to: period ? toISODate(period[2]) : undefined,
    openingBalance: money("opening balance"),
    closingBalance: money("closing balance"),
  };
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.005;

export function parseStatement(pages: StatementItem[][]): ParsedStatement {
  const pageLines = pages.map(toLines);
  type Draft = { lines: Line[] };
  const drafts: Draft[] = [];
  const headLines: Line[] = [];
  let columns: Column[] | undefined;

  for (const lines of pageLines) {
    let inTable = false;
    let current: Draft | undefined;
    for (const line of lines) {
      const heading = readHeading(line);
      if (heading) {
        columns = heading;
        inTable = true;
        current = undefined;
        continue;
      }
      // Everything above the first heading is the account details block.
      if (!columns) {
        headLines.push(line);
        continue;
      }
      if (STOP.test(line.text) && inTable) break;
      const dateCol = columns.find((c) => c.key === "date");
      const textStart = columns.find((c) => c.key === "desc")?.left ?? (dateCol ? dateCol.left + 70 : 120);
      const first = line.items[0];
      if (first.x < textStart && toISODate(first.str)) {
        inTable = true;
        current = { lines: [line] };
        drafts.push(current);
      } else if (current && inTable) {
        // A gap of more than four lines means the table has ended (signature blocks, notes).
        const last = current.lines.at(-1)!;
        if (last.y - line.y > 48) {
          current = undefined;
          continue;
        }
        current.lines.push(line);
      }
    }
  }
  const meta = findMeta(headLines.map((l) => l.text).join("\n"), pageLines.flat().map((l) => l.text).join("\n"));
  if (!columns) return { ...meta, rows: [] };

  const amountCols = columns.filter((c) => ["debit", "credit", "amount", "balance"].includes(c.key));
  const amountZone = Math.min(...amountCols.map((c) => c.left)) - 30;
  const refCol = columns.find((c) => c.key === "ref");
  const nextAfterRef = refCol ? Math.min(...columns.filter((c) => c.left > refCol.left).map((c) => c.left), Infinity) : Infinity;

  const rows: StatementRow[] = drafts.map(({ lines }) => {
    const items = lines.flatMap((l, li) => l.items.map((it) => ({ ...it, li })));
    const date = toISODate(items[0].str)!;
    const amounts = items.filter((it) => it.x + it.w > amountZone && AMOUNT.test(it.str.trim()) && it !== items[0]);
    // Amounts on later lines only count when the first line had none (some banks print them lower down).
    const firstLineAmounts = amounts.filter((a) => a.li === 0);
    const used = firstLineAmounts.length ? firstLineAmounts : amounts.filter((a) => a.li === Math.min(...amounts.map((x) => x.li)));
    let debit = 0;
    let credit = 0;
    let balance: number | undefined;
    const byRight = [...used].sort((a, b) => a.x + a.w - (b.x + b.w));
    for (const [i, a] of byRight.entries()) {
      const right = a.x + a.w;
      const nearest = [...amountCols].sort((p, q) => Math.abs(p.right - right) - Math.abs(q.right - right))[0];
      const isLast = i === byRight.length - 1;
      const key = isLast && byRight.length > 1 && amountCols.some((c) => c.key === "balance") ? "balance" : nearest.key === "balance" && byRight.length > 1 ? "credit" : nearest.key;
      if (key === "balance") balance = toAmount(a.str, true);
      else if (key === "debit") debit = Math.abs(toAmount(a.str, false));
      else if (key === "credit") credit = Math.abs(toAmount(a.str, false));
      else if (/dr\.?$/i.test(a.str.trim())) debit = Math.abs(toAmount(a.str, false));
      else credit = Math.abs(toAmount(a.str, false));
    }
    const refItems = refCol ? items.filter((it) => it.li === 0 && it.x >= refCol.left - 14 && it.x < nextAfterRef - 4 && it.x + it.w <= amountZone) : [];
    // Short numbers on the first line are branch codes, not part of the narration.
    const branchCode = (it: (typeof items)[number]) => it.li === 0 && /^\d{1,5}$/.test(it.str.trim());
    const words = items
      .filter((it) => it !== items[0] && it.x + it.w <= amountZone && !refItems.includes(it) && !branchCode(it) && !AMOUNT.test(it.str.trim()))
      .map((it) => it.str.trim().replace(/^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\s*/, ""))
      .filter((s) => s && !TIME.test(s) && !toISODate(s) && !/^[-/]+$/.test(s));
    const description = words.join(" ").replace(/\s+/g, " ").replace(/\s*-\s*$/, "").trim();
    const ref = refItems.map((r) => r.str.trim()).filter((s) => !/^[-/]+$/.test(s)).join(" ") || undefined;
    return { date, description, ref, debit, credit, balance, check: "unknown" as const };
  });

  // Newest-first statements are read oldest-first so the running balance can be checked.
  if (rows.length > 1 && rows[0].date > rows[rows.length - 1].date) rows.reverse();

  let prev = meta.openingBalance ?? (rows[0]?.balance !== undefined ? rows[0].balance - rows[0].credit + rows[0].debit : undefined);
  for (const row of rows) {
    if (row.balance === undefined || prev === undefined) {
      if (row.balance !== undefined) prev = row.balance;
      continue;
    }
    const amount = row.debit || row.credit;
    if (near(prev + row.credit - row.debit, row.balance)) row.check = "ok";
    else if (near(prev - row.credit + row.debit, row.balance)) {
      [row.debit, row.credit] = [row.credit, row.debit];
      row.check = "fixed";
    } else if (near(prev + amount, row.balance)) {
      [row.debit, row.credit, row.check] = [0, amount, "fixed"];
    } else if (near(prev - amount, row.balance)) {
      [row.debit, row.credit, row.check] = [amount, 0, "fixed"];
    } else row.check = "mismatch";
    prev = row.balance;
  }

  return { ...meta, rows };
}
