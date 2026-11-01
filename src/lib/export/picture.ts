import { pdfFromJpegs } from "./pdf";
import { shownValue, type ExportDoc } from "./table";

/**
 * Tables drawn onto a canvas, the way they look in the app (light theme): one tall JPEG picture, or A4 pages for
 * the PDF with the column headings repeated on every page.
 */
const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';
const INK = "#1d1d1f";
const GREY = "#6e6e73";
const LINE = "#e5e5ea";
const HEAD_BG = "#f5f5f7";
const SHADE = "#fafafa";
const PAD = 28;
const CELL = 10;
const heights = { doc: 84, caption: 34, head: 30, row: 28, gap: 18, note: 30 } as const;

type Block =
  | { type: "doc" }
  | { type: "caption"; text: string }
  | { type: "head"; t: number }
  | { type: "row"; t: number; cells: string[]; bold?: boolean; shade?: boolean }
  | { type: "gap" }
  | { type: "note"; text: string };

type Layout = { width: number; widths: number[][]; right: boolean[][] };

const font = (size: number, bold = false) => `${bold ? "600 " : ""}${size}px ${FONT}`;

function context(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't draw pictures.");
  return ctx;
}

/** Text cut to fit a width, ending in "…". */
function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(`${text.slice(0, mid)}…`).width <= max) lo = mid;
    else hi = mid - 1;
  }
  return `${text.slice(0, lo)}…`;
}

function prepare(doc: ExportDoc) {
  const ctx = context(document.createElement("canvas"));
  const shown = doc.tables.map((t) => ({
    rows: t.rows.map((r) => t.columns.map((c, i) => shownValue(r[i], c.kind))),
    totals: (t.totals ?? []).map((r) => t.columns.map((c, i) => shownValue(r[i], c.kind))),
  }));
  const widths = doc.tables.map((t, ti) =>
    t.columns.map((c, i) => {
      ctx.font = font(12, true);
      let w = ctx.measureText(c.label).width;
      ctx.font = font(13);
      for (const row of shown[ti].rows.slice(0, 400)) w = Math.max(w, ctx.measureText(row[i]).width);
      ctx.font = font(13, true);
      for (const row of shown[ti].totals) w = Math.max(w, ctx.measureText(row[i]).width);
      return Math.min(280, Math.max(48, Math.ceil(w) + CELL * 2));
    }),
  );
  ctx.font = font(18, true);
  const titleWidth = Math.max(ctx.measureText(doc.firmName).width, ctx.measureText(doc.title).width);
  const width = Math.ceil(Math.max(560, titleWidth, ...widths.map((w) => w.reduce((s, x) => s + x, 0)))) + PAD * 2;
  const layout: Layout = { width, widths, right: doc.tables.map((t) => t.columns.map((c) => c.kind === "inr" || c.kind === "number")) };

  const blocks: Block[] = [{ type: "doc" }];
  doc.tables.forEach((t, ti) => {
    if (ti > 0) blocks.push({ type: "gap" });
    if (t.title && doc.tables.length > 1) blocks.push({ type: "caption", text: t.title });
    blocks.push({ type: "head", t: ti });
    shown[ti].rows.forEach((cells, i) => blocks.push({ type: "row", t: ti, cells, shade: i % 2 === 1 }));
    shown[ti].totals.forEach((cells) => blocks.push({ type: "row", t: ti, cells, bold: true }));
  });
  return { layout, blocks };
}

function drawBlock(ctx: CanvasRenderingContext2D, doc: ExportDoc, layout: Layout, block: Block, y: number) {
  const h = heights[block.type];
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  if (block.type === "doc") {
    ctx.fillStyle = INK;
    ctx.font = font(18, true);
    ctx.fillText(doc.firmName, PAD, y + 16);
    ctx.font = font(15, true);
    ctx.fillText(doc.title, PAD, y + 42);
    ctx.fillStyle = GREY;
    ctx.font = font(13);
    ctx.fillText(doc.subtitle, PAD, y + 64);
    return;
  }
  if (block.type === "caption") {
    ctx.fillStyle = INK;
    ctx.font = font(14, true);
    ctx.fillText(block.text, PAD, y + h / 2 + 2);
    return;
  }
  if (block.type === "note") {
    ctx.fillStyle = GREY;
    ctx.font = font(12);
    ctx.fillText(block.text, PAD, y + h / 2);
    return;
  }
  if (block.type === "gap") return;

  const widths = layout.widths[block.t];
  const right = layout.right[block.t];
  const tableWidth = widths.reduce((s, x) => s + x, 0);
  const cells = block.type === "head" ? doc.tables[block.t].columns.map((c) => c.label) : block.cells;
  if (block.type === "head") {
    ctx.fillStyle = HEAD_BG;
    ctx.fillRect(PAD, y, tableWidth, h);
    ctx.font = font(12, true);
  } else {
    if (block.shade) {
      ctx.fillStyle = SHADE;
      ctx.fillRect(PAD, y, tableWidth, h);
    }
    ctx.font = font(13, block.bold);
  }
  ctx.fillStyle = block.type === "head" ? GREY : INK;
  let x = PAD;
  cells.forEach((text, i) => {
    const w = widths[i] ?? 0;
    const shown = fit(ctx, text, w - CELL * 2);
    if (right[i]) {
      ctx.textAlign = "right";
      ctx.fillText(shown, x + w - CELL, y + h / 2);
    } else {
      ctx.textAlign = "left";
      ctx.fillText(shown, x + CELL, y + h / 2);
    }
    x += w;
  });
  ctx.fillStyle = block.type === "row" && block.bold ? GREY : LINE;
  ctx.fillRect(PAD, block.type === "row" && block.bold ? y : y + h - 1, tableWidth, 1);
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not make the picture."))), type, quality));
}

const heightOf = (blocks: Block[]) => blocks.reduce((s, b) => s + heights[b.type], 0);

// Phones (iPhone Safari above all) refuse canvases bigger than about 16 million pixels.
const MAX_AREA = 16_000_000;
const MAX_SIDE = 16_000;

/** One tall JPEG. Very long lists keep their first rows and say how many more there are. */
export async function pictureFile(doc: ExportDoc): Promise<Blob> {
  const { layout, blocks } = prepare(doc);
  const maxHeight = Math.min(MAX_SIDE, MAX_AREA / layout.width);
  let kept = blocks;
  if (heightOf(blocks) + PAD * 2 > maxHeight) {
    const rows = blocks.filter((b) => b.type === "row").length;
    kept = [];
    let used = PAD * 2 + heights.note;
    for (const b of blocks) {
      if (used + heights[b.type] > maxHeight) break;
      kept.push(b);
      used += heights[b.type];
    }
    const shownRows = kept.filter((b) => b.type === "row").length;
    kept.push({ type: "note", text: `Showing ${shownRows} of ${rows} rows. Download Excel or PDF for all of them.` });
  }
  const height = heightOf(kept) + PAD * 2;
  const scale = Math.min(2, Math.sqrt(MAX_AREA / (layout.width * height)), MAX_SIDE / height, MAX_SIDE / layout.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(layout.width * scale);
  canvas.height = Math.floor(height * scale);
  const ctx = context(canvas);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, layout.width, height);
  let y = PAD;
  for (const b of kept) {
    drawBlock(ctx, doc, layout, b, y);
    y += heights[b.type];
  }
  return toBlob(canvas, "image/jpeg", 0.92);
}

/** A4 pages (landscape for wide tables), headings repeated on each page and "Page 2 of 5" at the foot. */
export async function pdfFile(doc: ExportDoc): Promise<Blob> {
  const { layout, blocks } = prepare(doc);
  const landscape = layout.width > 820;
  const pagePt: [number, number] = landscape ? [841.89, 595.28] : [595.28, 841.89];
  // Laid out in screen pixels (96 per inch), so 13px text prints at about 10pt; wider tables shrink to fit.
  const pageW = Math.max(layout.width, landscape ? 1123 : 794);
  const pageH = Math.round((pageW * pagePt[1]) / pagePt[0]);
  const bottom = pageH - PAD - 24;

  const pages: Block[][] = [];
  let page: Block[] = [];
  let y = PAD;
  for (const b of blocks) {
    const h = heights[b.type];
    // Keep a heading with at least one row under it.
    const need = b.type === "head" || b.type === "caption" ? h + heights.row : h;
    if (y + need > bottom && page.length > 0) {
      pages.push(page);
      page = [];
      y = PAD;
      if (b.type === "gap") continue;
      if (b.type === "row") {
        page.push({ type: "head", t: b.t });
        y += heights.head;
      }
    }
    page.push(b);
    y += h;
  }
  if (page.length > 0) pages.push(page);

  const scale = 2;
  const jpegs = [];
  for (const [i, blocksOnPage] of pages.entries()) {
    const canvas = document.createElement("canvas");
    canvas.width = pageW * scale;
    canvas.height = pageH * scale;
    const ctx = context(canvas);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageW, pageH);
    let top = PAD;
    for (const b of blocksOnPage) {
      drawBlock(ctx, doc, layout, b, top);
      top += heights[b.type];
    }
    ctx.fillStyle = GREY;
    ctx.font = font(11);
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(fit(ctx, `${doc.firmName} · ${doc.title} · ${doc.subtitle}`, pageW - PAD * 2 - 120), PAD, pageH - PAD);
    ctx.textAlign = "right";
    ctx.fillText(`Page ${i + 1} of ${pages.length}`, pageW - PAD, pageH - PAD);
    const blob = await toBlob(canvas, "image/jpeg", 0.9);
    jpegs.push({ jpeg: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height });
  }
  return pdfFromJpegs(jpegs, pagePt);
}
