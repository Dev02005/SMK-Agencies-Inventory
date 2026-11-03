"use client";

import { Bell, Calculator, Delete, Home, NotebookPen, Package, Trash2, Truck, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition, type PointerEvent as ReactPointerEvent } from "react";
import { deleteQuickNote, listQuickNotes, saveQuickNote } from "@/app/(app)/quick-note-actions";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { calculate } from "@/lib/calculate";
import { cn } from "@/lib/cn";
import type { QuickNote } from "@/lib/data";
import type { Role } from "@/lib/data/types";
import { formatNumber } from "@/lib/format";
import { quickAddItems, toneClasses, type Tone } from "@/lib/sections";

const SIZE = 52;
const KEY = "ska-notes-ball";

// ── Where the ball sits: a screen side and how far down, remembered on this device ───────────────────────────────

type Spot = { side: "left" | "right"; top: number };
const DEFAULT_SPOT = "right:0.7";
const spotListeners = new Set<() => void>();

const readSpot = () => {
  try {
    return window.localStorage.getItem(KEY) ?? DEFAULT_SPOT;
  } catch {
    return DEFAULT_SPOT;
  }
};

function saveSpot(spot: Spot) {
  try {
    window.localStorage.setItem(KEY, `${spot.side}:${spot.top.toFixed(3)}`);
  } catch {
    // Not remembered this time; the ball still moves.
  }
  spotListeners.forEach((listener) => listener());
}

const subscribeSpot = (callback: () => void) => {
  spotListeners.add(callback);
  return () => spotListeners.delete(callback);
};

function parseSpot(raw: string): Spot {
  const [side, top] = raw.split(":");
  const fraction = parseFloat(top);
  return { side: side === "left" ? "left" : "right", top: Number.isFinite(fraction) ? Math.min(0.9, Math.max(0.1, fraction)) : 0.7 };
}

// ── Shortcuts: the Quick add list for the role, plus a few places people go often ────────────────────────────────

type Shortcut = { label: string; href: string; icon: LucideIcon; tone: Tone; roles: Role[] };
const places: Shortcut[] = [
  { label: "Home", href: "/", icon: Home, tone: "grey", roles: ["owner", "office", "godown", "field", "driver"] },
  { label: "Godown stock", href: "/stock", icon: Package, tone: "amber", roles: ["owner", "office", "godown"] },
  { label: "Lorry purchase", href: "/purchases/lorries/new", icon: Truck, tone: "purple", roles: ["owner"] },
  { label: "Lorry sales", href: "/sales/lorries", icon: Truck, tone: "purple", roles: ["owner"] },
  { label: "Notifications", href: "/notifications", icon: Bell, tone: "teal", roles: ["owner", "office", "godown", "field", "driver"] },
];

type Tab = "notes" | "shortcuts" | "calculator";

/**
 * A small floating ball on every screen, like the assistive ball on a phone: drag it to either side, tap it for quick
 * notes (saved for the signed-in person, on every device), shortcuts for their role and a calculator.
 */
export function NotesBall({ role }: { role: Role }) {
  const spot = parseSpot(useSyncExternalStore(subscribeSpot, readSpot, () => DEFAULT_SPOT));
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("notes");
  const [notes, setNotes] = useState<QuickNote[] | null>(null);
  const [, startLoading] = useTransition();

  function show() {
    setOpen(true);
    startLoading(async () => setNotes(await listQuickNotes()));
  }

  function onPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY, moved: false };
  }
  function onPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const s = start.current;
    if (!s) return;
    if (!s.moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) < 6) return;
    s.moved = true;
    setDrag({ x: e.clientX - SIZE / 2, y: e.clientY - SIZE / 2 });
  }
  function onPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    const s = start.current;
    start.current = null;
    if (!s) return;
    if (!s.moved) {
      show();
      return;
    }
    // Let go: it settles on the nearer side, where it was dropped.
    saveSpot({ side: e.clientX < window.innerWidth / 2 ? "left" : "right", top: Math.min(0.9, Math.max(0.1, e.clientY / window.innerHeight)) });
    setDrag(null);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Notes and shortcuts"
        title="Notes and shortcuts (drag to move)"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          start.current = null;
          setDrag(null);
        }}
        // Pointer taps open it above; this is for the keyboard (Enter or Space).
        onClick={(e) => {
          if (e.detail === 0) show();
        }}
        className={cn(
          "fixed z-40 grid touch-none select-none place-items-center rounded-full bg-ink/75 text-white shadow-raised ring-4 ring-white/40 backdrop-blur transition-[opacity,transform] print:hidden",
          drag ? "scale-110 opacity-100" : "opacity-70 hover:opacity-100",
          open && "hidden",
        )}
        style={
          drag
            ? { left: drag.x, top: drag.y, width: SIZE, height: SIZE }
            : { [spot.side]: 8, top: `clamp(72px, calc(${spot.top * 100}dvh - ${SIZE / 2}px), calc(100dvh - 140px))`, width: SIZE, height: SIZE }
        }
      >
        <span className="grid size-8 place-items-center rounded-full bg-white/20">
          <NotebookPen size={18} strokeWidth={2} aria-hidden />
        </span>
      </button>
      {open && <Panel role={role} tab={tab} onTab={setTab} notes={notes} onNotes={setNotes} onClose={() => setOpen(false)} />}
    </>
  );
}

function Panel({
  role,
  tab,
  onTab,
  notes,
  onNotes,
  onClose,
}: {
  role: Role;
  tab: Tab;
  onTab: (tab: Tab) => void;
  notes: QuickNote[] | null;
  onNotes: (notes: QuickNote[]) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 print:hidden" role="dialog" aria-modal="true" aria-label="Notes and shortcuts">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/25" onClick={onClose} />
      <div className="animate-fade-up absolute left-1/2 top-1/2 flex max-h-[min(600px,calc(100dvh-96px))] w-[min(400px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[24px] bg-card p-4 shadow-raised">
        <div className="mb-3 flex items-center gap-2">
          <Segmented
            label="Show"
            className="flex-1"
            value={tab}
            onChange={onTab}
            options={[
              { value: "notes", label: "Notes" },
              { value: "shortcuts", label: "Shortcuts" },
              { value: "calculator", label: "Calculator" },
            ]}
          />
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 shrink-0 place-items-center rounded-full bg-hairline text-ink-secondary">
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === "notes" && <Notes notes={notes} onNotes={onNotes} />}
          {tab === "shortcuts" && <Shortcuts role={role} onPick={onClose} />}
          {tab === "calculator" && <CalculatorPad />}
        </div>
      </div>
    </div>
  );
}

const noteTime = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function Notes({ notes, onNotes }: { notes: QuickNote[] | null; onNotes: (notes: QuickNote[]) => void }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    if (!text.trim() || pending) return;
    startTransition(async () => {
      const result = await saveQuickNote(text);
      if (!result.ok) {
        toast(result.problem);
        return;
      }
      onNotes([result.note, ...(notes ?? [])]);
      setText("");
    });
  }

  return (
    <div>
      <textarea
        aria-label="New note"
        rows={3}
        maxLength={1000}
        autoFocus
        className={cn(inputClass, "h-auto resize-none py-3")}
        placeholder="Write a note…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save();
        }}
      />
      <div className="mt-2 flex justify-end">
        <Button disabled={!text.trim() || pending} onClick={save}>
          {pending ? "Saving…" : "Save note"}
        </Button>
      </div>
      {notes === null ? (
        <p className="py-4 text-center text-[13px] text-ink-secondary">Loading your notes…</p>
      ) : notes.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-ink-secondary">No notes yet. They are saved for you and show on every device.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="flex items-start gap-2 rounded-2xl bg-warning-soft/50 px-3.5 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap break-words text-[15px] text-ink">{n.text}</p>
                <p className="mt-0.5 text-[12px] text-ink-secondary">{noteTime.format(new Date(n.at))}</p>
              </div>
              <button
                type="button"
                aria-label="Delete note"
                className="grid size-8 shrink-0 place-items-center rounded-full text-ink-secondary hover:bg-card hover:text-danger"
                onClick={() =>
                  startTransition(async () => {
                    if (await deleteQuickNote(n.id)) onNotes(notes.filter((x) => x.id !== n.id));
                    else toast("That note was already deleted.");
                  })
                }
              >
                <Trash2 size={16} strokeWidth={1.9} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Shortcuts({ role, onPick }: { role: Role; onPick: () => void }) {
  const items = [...places, ...quickAddItems].filter((item) => item.roles.includes(role));
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={`${item.label}-${item.href}`}
            href={item.href}
            onClick={onPick}
            className="flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-center text-[13px] text-ink hover:bg-card-subtle"
          >
            <span className={cn("grid size-11 place-items-center rounded-full", toneClasses[item.tone])}>
              <Icon size={21} strokeWidth={1.75} aria-hidden />
            </span>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

const keys = ["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", "0", ".", "%", "+"];

function CalculatorPad() {
  const [sum, setSum] = useState("");
  const result = calculate(sum);
  return (
    <div>
      <div className="rounded-2xl bg-card-subtle px-4 py-3">
        <input
          aria-label="Sum"
          className="w-full bg-transparent text-right text-[17px] tabular-nums text-ink-secondary outline-none"
          value={sum}
          onChange={(e) => setSum(e.target.value)}
          placeholder="200 × 360 + 3000"
          inputMode="decimal"
        />
        <p className="mt-1 flex items-center justify-end gap-1.5 text-right text-[30px] font-semibold tabular-nums tracking-[-0.4px] text-ink">
          <Calculator size={18} strokeWidth={1.9} className="text-ink-tertiary" aria-hidden />
          {result === null ? "–" : formatNumber(result, 2)}
        </p>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setSum((s) => s + k)}
            className={cn("h-12 rounded-2xl text-[19px] font-medium", /\d|\./.test(k) ? "bg-hairline/60 text-ink hover:bg-hairline" : "bg-accent-soft text-accent hover:bg-accent/15")}
          >
            {k}
          </button>
        ))}
        <button type="button" onClick={() => setSum("")} className="col-span-2 h-12 rounded-2xl bg-hairline/60 text-[15px] font-medium text-ink hover:bg-hairline">
          Clear
        </button>
        <button type="button" aria-label="Delete last" onClick={() => setSum((s) => s.slice(0, -1))} className="grid h-12 place-items-center rounded-2xl bg-hairline/60 text-ink hover:bg-hairline">
          <Delete size={20} strokeWidth={1.9} aria-hidden />
        </button>
        <button
          type="button"
          disabled={result === null}
          onClick={() => result !== null && setSum(String(result))}
          className="h-12 rounded-2xl bg-accent text-[19px] font-semibold text-white disabled:opacity-40"
        >
          =
        </button>
      </div>
    </div>
  );
}
