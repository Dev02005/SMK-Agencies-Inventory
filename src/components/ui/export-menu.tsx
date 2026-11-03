"use client";

import { Copy, Download, FileImage, FileSpreadsheet, FileText, Loader2, Mail, MessageCircle, Printer, Share2, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconButton } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { resolveDateFilter, type DatePreset } from "@/lib/date-filter";
import { asFile, copyPicture, downloadFile, shareFile, type FileKind } from "@/lib/export/save";
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

const item = "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[15px] text-ink hover:bg-card-subtle disabled:opacity-40";

type Made = { file: File; kind: FileKind; message: string };
/**
 * After Share is picked: "retry" when the browser wants a fresh tap before opening the share sheet (making the file
 * took a moment), "manual" when it can't hand files to other apps at all, so the person saves it and attaches it.
 */
type ShareStep = { made: Made; step: "retry" | "manual" };

/**
 * Download and Share for what the page shows (after its filters): Excel, PDF or a JPG picture. Share opens the
 * phone's or computer's share sheet (WhatsApp, mail…); where a browser can't share files, it saves the file and
 * offers WhatsApp, email and (for pictures) copy-to-paste. Download also offers Print.
 */
export function ExportMenu({ title, subtitle, dated, tables }: Props) {
  const toast = useToast();
  const ref = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<"download" | "share" | null>(null);
  // The menu opens towards whichever side has room, so it never runs off the screen.
  const [alignRight, setAlignRight] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shareStep, setShareStep] = useState<ShareStep | null>(null);

  useEffect(() => {
    if (!menu) return;
    function onPointer(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setMenu(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenu(null);
    }
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  function toggle(which: "download" | "share", button: HTMLElement) {
    if (menu !== which) {
      setAlignRight(button.getBoundingClientRect().left + 296 > window.innerWidth);
      setShareStep(null);
      // Load the file makers now, so sharing still counts as the same tap.
      void import("@/lib/export/excel");
      void import("@/lib/export/picture");
    }
    setMenu((current) => (current === which ? null : which));
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

  async function makeFile(kind: FileKind): Promise<Made | null> {
    const doc = currentDoc();
    if (!doc) {
      setMenu(null);
      toast("Nothing to send: there are no rows here for these dates.");
      return null;
    }
    const file = asFile(await make[kind](doc), fileNameFor(doc), kind);
    return { file, kind, message: `${doc.firmName} · ${doc.title} · ${doc.subtitle}` };
  }

  async function download(kind: FileKind) {
    setBusy(true);
    try {
      const made = await makeFile(kind);
      if (!made) return;
      downloadFile(made.file);
      setMenu(null);
      toast(`${made.file.name} downloaded`);
    } catch {
      setMenu(null);
      toast("Could not make the file. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function share(made: Made) {
    const result = await shareFile(made.file, made.message);
    if (result === "shared" || result === "cancelled") {
      setShareStep(null);
      setMenu(null);
    } else {
      setShareStep({ made, step: result === "blocked" ? "retry" : "manual" });
    }
  }

  async function startShare(kind: FileKind) {
    setBusy(true);
    try {
      const made = await makeFile(kind);
      if (made) await share(made);
    } catch {
      setMenu(null);
      toast("Could not make the file. Try again.");
    } finally {
      setBusy(false);
    }
  }

  /** Saves the file, then opens WhatsApp or the mail app with a note, ready for the file to be attached. */
  function sendVia(app: "whatsapp" | "email", made: Made) {
    downloadFile(made.file);
    const note = `${made.message}. File attached: ${made.file.name}`;
    if (app === "whatsapp") window.open(`https://wa.me/?text=${encodeURIComponent(note)}`, "_blank", "noopener");
    else window.location.href = `mailto:?subject=${encodeURIComponent(made.message)}&body=${encodeURIComponent(note)}`;
    toast(`${made.file.name} saved. Attach it in ${app === "whatsapp" ? "WhatsApp" : "the email"}.`);
    setShareStep(null);
    setMenu(null);
  }

  async function copy(made: Made) {
    try {
      await copyPicture(made.file);
      toast("Picture copied. Paste it into WhatsApp or an email.");
      setShareStep(null);
      setMenu(null);
    } catch {
      toast("This browser can't copy pictures. Use Save file instead.");
    }
  }

  const kindButtons = (onPick: (kind: FileKind) => void, icon?: LucideIcon) =>
    kinds.map(({ kind, label, icon: KindIcon }) => {
      const Icon = icon ?? KindIcon;
      return (
        <button key={kind} type="button" role="menuitem" className={item} disabled={busy} onClick={() => onPick(kind)}>
          <Icon size={17} strokeWidth={1.75} className="text-ink-secondary" aria-hidden />
          {label}
        </button>
      );
    });

  return (
    <div ref={ref} className="flex flex-wrap gap-2 print:hidden">
      <div className="relative">
        <IconButton label="Download" onClick={(e) => toggle("download", e.currentTarget)} aria-expanded={menu === "download"} aria-haspopup="menu" disabled={busy}>
          {busy && menu === "download" ? <Loader2 size={19} strokeWidth={2} className="animate-spin" aria-hidden /> : <Download size={19} strokeWidth={1.9} aria-hidden />}
        </IconButton>
        {menu === "download" && (
          <MenuPanel alignRight={alignRight}>
            <p className="px-3 pb-1 pt-1.5 text-[12px] text-ink-tertiary">Download as</p>
            {kindButtons((kind) => void download(kind))}
            <div className="mt-1 border-t border-hairline pt-1">
              <button
                type="button"
                role="menuitem"
                className={item}
                onClick={() => {
                  setMenu(null);
                  window.print();
                }}
              >
                <Printer size={17} strokeWidth={1.75} className="text-ink-secondary" aria-hidden />
                Print
              </button>
            </div>
          </MenuPanel>
        )}
      </div>

      <div className="relative">
        <IconButton label="Share" onClick={(e) => toggle("share", e.currentTarget)} aria-expanded={menu === "share"} aria-haspopup="menu" disabled={busy}>
          {busy && menu === "share" ? <Loader2 size={19} strokeWidth={2} className="animate-spin" aria-hidden /> : <Share2 size={19} strokeWidth={1.9} aria-hidden />}
        </IconButton>
        {menu === "share" && (
          <MenuPanel alignRight={alignRight}>
            {!shareStep ? (
              <>
                <p className="px-3 pb-1 pt-1.5 text-[12px] text-ink-tertiary">Share as (WhatsApp, mail…)</p>
                {kindButtons((kind) => void startShare(kind))}
              </>
            ) : shareStep.step === "retry" ? (
              <div className="flex items-center gap-3 p-2">
                <p className="min-w-0 flex-1 text-[14px] text-ink-secondary">{shareStep.made.file.name} is ready.</p>
                <IconButton label="Share now" variant="primary" onClick={() => void share(shareStep.made)}>
                  <Share2 size={19} strokeWidth={1.9} aria-hidden />
                </IconButton>
              </div>
            ) : (
              <div className="space-y-1 p-1">
                <p className="px-2 pb-1 pt-1 text-[13px] leading-[18px] text-ink-secondary">
                  {shareStep.made.file.name} is ready. This browser can&apos;t hand files to other apps, so send it like this:
                </p>
                <button type="button" role="menuitem" className={item} onClick={() => sendVia("whatsapp", shareStep.made)}>
                  <MessageCircle size={17} strokeWidth={1.75} className="text-good" aria-hidden />
                  WhatsApp (save, then attach)
                </button>
                <button type="button" role="menuitem" className={item} onClick={() => sendVia("email", shareStep.made)}>
                  <Mail size={17} strokeWidth={1.75} className="text-accent" aria-hidden />
                  Email (save, then attach)
                </button>
                {shareStep.made.kind === "jpg" && (
                  <button type="button" role="menuitem" className={item} onClick={() => void copy(shareStep.made)}>
                    <Copy size={17} strokeWidth={1.75} className="text-purple" aria-hidden />
                    Copy picture to paste
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  className={item}
                  onClick={() => {
                    downloadFile(shareStep.made.file);
                    setShareStep(null);
                    setMenu(null);
                  }}
                >
                  <Download size={17} strokeWidth={1.75} className="text-ink-secondary" aria-hidden />
                  Save file
                </button>
              </div>
            )}
          </MenuPanel>
        )}
      </div>
    </div>
  );
}

function MenuPanel({ alignRight, children }: { alignRight: boolean; children: ReactNode }) {
  return (
    <div role="menu" className={cn("surface animate-fade-up absolute top-12 z-40 w-72 p-2 shadow-raised", alignRight ? "right-0" : "left-0")}>
      {children}
    </div>
  );
}
