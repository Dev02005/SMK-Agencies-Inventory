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

/** Phones and Windows/Mac browsers that can hand a file to WhatsApp, mail and the like. */
export function canShareFiles(kind: FileKind = "jpg") {
  try {
    return typeof navigator.canShare === "function" && navigator.canShare({ files: [new File([""], `test.${kind}`, { type: types[kind] })] });
  } catch {
    return false;
  }
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
