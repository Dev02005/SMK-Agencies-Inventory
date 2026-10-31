"use client";

import { parseStatement, type ParsedStatement, type StatementItem } from "./statement-parser";

export type ReadResult =
  | { ok: true; statement: ParsedStatement; pages: number }
  | { ok: false; reason: "password" | "wrong-password" | "no-text" | "no-table" | "too-big" | "unreadable" };

const MAX_PAGES = 80;

/**
 * Opens a statement PDF in the browser with pdf.js and reads its transactions table. The file never leaves the
 * device. pdf.js is loaded only when a statement is opened, so it adds nothing to normal page loads.
 */
export async function readStatement(file: File, password?: string): Promise<ReadResult> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  try {
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), password, enableXfa: false });
    const doc = await task.promise;
    if (doc.numPages > MAX_PAGES) {
      await task.destroy();
      return { ok: false, reason: "too-big" };
    }
    const pages: StatementItem[][] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const content = await (await doc.getPage(n)).getTextContent();
      pages.push(content.items.flatMap((item) => ("str" in item && item.str.trim() ? [{ str: item.str, x: item.transform[4], y: item.transform[5], w: item.width }] : [])));
    }
    await task.destroy();
    if (!pages.some((p) => p.length)) return { ok: false, reason: "no-text" };
    const statement = parseStatement(pages);
    return statement.rows.length ? { ok: true, statement, pages: pages.length } : { ok: false, reason: "no-table" };
  } catch (error) {
    if (error instanceof pdfjs.PasswordException) {
      return { ok: false, reason: error.code === pdfjs.PasswordResponses.INCORRECT_PASSWORD ? "wrong-password" : "password" };
    }
    return { ok: false, reason: "unreadable" };
  }
}
