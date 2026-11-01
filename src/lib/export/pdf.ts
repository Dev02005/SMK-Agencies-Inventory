/**
 * The smallest PDF that holds whole-page pictures: one JPEG per page, drawn edge to edge. Enough for printing and
 * sharing a table, with no PDF library to load.
 */
export function pdfFromJpegs(pages: { jpeg: Uint8Array<ArrayBuffer>; width: number; height: number }[], [pageW, pageH]: [number, number]): Blob {
  const encoder = new TextEncoder();
  const parts: Uint8Array<ArrayBuffer>[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (chunk: string | Uint8Array<ArrayBuffer>) => {
    const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
    parts.push(bytes);
    length += bytes.length;
  };
  const object = (id: number, ...body: (string | Uint8Array<ArrayBuffer>)[]) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
    body.forEach(push);
    push("\nendobj\n");
  };

  // Objects: 1 catalog, 2 page tree, then three per page (page, drawing, picture).
  const ids = pages.map((_, i) => ({ page: 3 + i * 3, content: 4 + i * 3, image: 5 + i * 3 }));
  const w = pageW.toFixed(2);
  const h = pageH.toFixed(2);

  push("%PDF-1.4\n%âãÏÓ\n");
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, `<< /Type /Pages /Kids [${ids.map((x) => `${x.page} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  pages.forEach((p, i) => {
    const { page, content, image } = ids[i];
    object(page, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im${i} ${image} 0 R >> >> /Contents ${content} 0 R >>`);
    const draw = `q ${w} 0 0 ${h} 0 0 cm /Im${i} Do Q`;
    object(content, `<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`);
    object(
      image,
      `<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`,
      p.jpeg,
      "\nendstream",
    );
  });

  const count = 3 + pages.length * 3;
  const xref = length;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let id = 1; id < count; id++) push(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts, { type: "application/pdf" });
}
