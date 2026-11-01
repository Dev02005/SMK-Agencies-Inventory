"use client";

import { ChevronDown, Download, FileImage, FileSpreadsheet, FileText, Printer, Share2, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { resolveDateFilter, type DatePreset } from "@/lib/date-filter";
import { asFile, canShareFiles, downloadFile, shareFile, type FileKind } from "@/lib/export/save";
import { fileNameFor, tablesOnPage, type ExportDoc, type TableData } from "@/lib/export/table";
import { formatDate, todayISO } from "@/lib/format";

type Props = {
  title: string;
  /** Printed under the title. By default the date filter in the address, or "As of <today>" for lists without dates. */
  subtitle?: string;
  /** This page's date choices (true for the usual ones), so the file says which dates it holds. */
  dated?: DatePreset[] | boolean;
  /** Tables to use instead of the ones on screen (reports pass theirs with proper number types). */
  tables?: TableData[];
};

const kinds: { kind: FileKind; label: string; icon: LucideIcon }[] = [
  { kind: "xlsx", label: "Excel", icon: FileSpreadsheet },
  { kind: "pdf", label: "PDF", icon: FileText },
  { kind: "jpg", label: "Picture (JPG)", icon: FileImage },
];

const make = {
  xlsx: async (doc: ExportDoc) => (await import("@/lib/export/excel")).excelFile(doc),
  pdf: async (doc: ExportDoc) => (await import("@/lib/export/picture")).pdfFile(doc),
  jpg: async (doc: ExportDoc) => (await import("@/lib/export/picture")).pictureFile(doc),
};

const item = "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[15px] text-ink hover:bg-card-subtle";

/** Download or share what the page shows (after its filters) as Excel, PDF or a JPG picture, or print it. */
export function ExportMenu({ title, subtitle, dated, tables }: Props) {
  const toast = useToast();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [canShare, setCanShare] = useState(false);
  // A file made but not yet shared, because the browser wanted a fresh tap.
  const [ready, setReady] = useState<{ file: File; title: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    if (!open) {
      setCanShare(canShareFiles());
      setReady(null);
      // Load the file makers now, so sharing still counts as the same tap.
      void import("@/lib/export/excel");
      void import("@/lib/export/picture");
    }
    setOpen((o) => !o);
  }

  function currentDoc(): ExportDoc | null {
    const found = tables ?? tablesOnPage();
    if (found.length === 0) return null;
    const today = todayISO();
    const shownDates = dated
      ? resolveDateFilter(new URLSearchParams(window.location.search), today, Array.isArray(dated) ? dated : undefined).label
      : `As of ${formatDate(today)}`;
    return { firmName: document.getElementById("main")?.dataset.firm || "SKA", title, subtitle: subtitle ?? shownDates, tables: found };
  }

  async function run(kind: FileKind, share: boolean) {
    const doc = currentDoc();
    if (!doc) {
      setOpen(false);
      toast("Nothing to download: there are no rows here for these dates.");
      return;
    }
    setBusy(true);
    try {
      const file = asFile(await make[kind](doc), fileNameFor(doc), kind);
      if (!share) {
        downloadFile(file);
        setOpen(false);
        toast(`${file.name} downloaded`);
        return;
      }
      const shareTitle = `${doc.title} · ${doc.subtitle}`;
      const result = await shareFile(file, shareTitle);
      if (result === "blocked") {
        setReady({ file, title: shareTitle });
        return;
      }
      setOpen(false);
      if (result === "unsupported") {
        downloadFile(file);
        toast(`This browser can't share files, so ${file.name} was downloaded.`);
      }
    } catch {
      setOpen(false);
      toast("Could not make the file. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={ref} className="relative print:hidden">
      <Button variant="secondary" onClick={toggle} aria-expanded={open} aria-haspopup="menu" disabled={busy}>
        <Download size={18} strokeWidth={1.75} aria-hidden />
        {busy ? "Making…" : "Download"}
        <ChevronDown size={16} strokeWidth={2} aria-hidden />
      </Button>
      {open && (
        // Under the button: from its left edge on phones (where it sits on the left), from its right edge on wide screens.
        <div role="menu" className="surface animate-fade-up absolute left-0 top-12 z-40 w-64 p-2 shadow-raised lg:left-auto lg:right-0">
          {ready ? (
            <div className="space-y-2 p-2">
              <p className="text-[14px] text-ink-secondary">{ready.file.name} is ready.</p>
              <Button
                className="w-full"
                onClick={async () => {
                  const result = await shareFile(ready.file, ready.title);
                  if (result !== "blocked") {
                    setReady(null);
                    setOpen(false);
                  }
                }}
              >
                <Share2 size={18} strokeWidth={1.75} aria-hidden /> Share
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  downloadFile(ready.file);
                  setReady(null);
                  setOpen(false);
                }}
              >
                Download instead
              </Button>
            </div>
          ) : (
            <>
              <p className="px-3 pb-1 pt-1.5 text-[12px] text-ink-tertiary">Download</p>
              {kinds.map(({ kind, label, icon: Icon }) => (
                <button key={kind} type="button" role="menuitem" className={item} disabled={busy} onClick={() => void run(kind, false)}>
                  <Icon size={17} strokeWidth={1.75} className="text-ink-secondary" aria-hidden />
                  {label}
                </button>
              ))}
              {canShare && (
                <>
                  <p className="mt-1 border-t border-hairline px-3 pb-1 pt-2.5 text-[12px] text-ink-tertiary">Share (WhatsApp, mail…)</p>
                  {kinds.map(({ kind, label }) => (
                    <button key={kind} type="button" role="menuitem" className={item} disabled={busy} onClick={() => void run(kind, true)}>
                      <Share2 size={17} strokeWidth={1.75} className="text-ink-secondary" aria-hidden />
                      {label}
                    </button>
                  ))}
                </>
              )}
              <div className="mt-1 border-t border-hairline pt-1">
                <button
                  type="button"
                  role="menuitem"
                  className={item}
                  onClick={() => {
                    setOpen(false);
                    window.print();
                  }}
                >
                  <Printer size={17} strokeWidth={1.75} className="text-ink-secondary" aria-hidden />
                  Print
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
