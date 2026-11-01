const types = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
  jpg: "image/jpeg",
} as const;

export type FileKind = keyof typeof types;

export function asFile(blob: Blob, name: string, kind: FileKind) {
  return new File([blob], `${name}.${kind}`, { type: types[kind] });
}

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Puts a picture on the clipboard (as PNG, the one image type clipboards take) to paste into WhatsApp or mail. */
export async function copyPicture(picture: Blob) {
  const bitmap = await createImageBitmap(picture);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
  const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No picture"))), "image/png"));
  await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
}

/**
 * Opens the device's share sheet. "blocked" means the browser wants a fresh tap (making the file took too long
 * after the first one); "unsupported" means this browser can't share files at all.
 */
export async function shareFile(file: File, title: string): Promise<"shared" | "cancelled" | "blocked" | "unsupported"> {
  if (!(typeof navigator.canShare === "function" && navigator.canShare({ files: [file] }))) return "unsupported";
  try {
    await navigator.share({ files: [file], title });
    return "shared";
  } catch (error) {
    return error instanceof DOMException && error.name === "AbortError" ? "cancelled" : "blocked";
  }
}
