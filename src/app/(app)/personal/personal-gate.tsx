"use client";

import { Delete, Lock } from "lucide-react";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { useViewAs } from "@/lib/roles";
import { choosePersonalPin, unlockPersonal } from "./actions";

/**
 * Owner-only, PIN-locked area. The PIN is checked on the server (lib/personal-lock.ts) and the records are only
 * read once it passes. "View as" hides the area from other roles here; with login the database enforces it too.
 */
export function OwnerOnly({ children }: { children: ReactNode }) {
  const [role] = useViewAs();
  if (role !== "owner") {
    return (
      <EmptyState icon={Lock} title="Only the owner can open Personal">
        Chits, rents, insurance, personal banks and notes are private to the owner&apos;s login.
      </EmptyState>
    );
  }
  return <>{children}</>;
}

/**
 * Shown by the Personal layout while locked. `choosing`: no PIN is set yet, so the owner picks one (twice, to be
 * sure) and Personal opens; it is kept, hashed, in the records.
 */
export function PinPad({ choosing }: { choosing: boolean }) {
  const [pin, setPin] = useState("");
  const [first, setFirst] = useState<string>();
  const [error, setError] = useState<string>();
  const [checking, startChecking] = useTransition();
  // The refs always have the latest digits, so very fast taps never read a stale value.
  const pinRef = useRef("");
  const firstRef = useRef<string>(undefined);

  function update(next: string) {
    pinRef.current = next;
    setPin(next);
  }

  function remember(entered: string | undefined) {
    firstRef.current = entered;
    setFirst(entered);
  }

  function fail(problem: string) {
    setError(problem);
    remember(undefined);
    window.setTimeout(() => update(""), 350);
  }

  function press(digit: string) {
    if (pinRef.current.length >= 4 || checking) return;
    const next = pinRef.current + digit;
    setError(undefined);
    update(next);
    if (next.length < 4) return;
    if (choosing && firstRef.current === undefined) {
      remember(next);
      window.setTimeout(() => update(""), 150);
      return;
    }
    if (choosing && next !== firstRef.current) return fail("The two PINs didn't match. Choose again.");
    // On success the server sets the unlock cookie and re-renders Personal with the records.
    startChecking(async () => {
      const { ok } = choosing ? await choosePersonalPin(next) : await unlockPersonal(next);
      if (!ok) fail(choosing ? "Couldn't save the PIN. Try again." : "Wrong PIN, try again");
    });
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <div className="mx-auto flex max-w-xs flex-col items-center py-10 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-full bg-purple/10 text-purple">
        <Lock size={26} strokeWidth={1.75} aria-hidden />
      </span>
      <h1 className="text-[22px] font-semibold tracking-[-0.3px] text-ink">
        {!choosing ? "Enter your personal PIN" : first ? "Enter the same PIN again" : "Choose your personal PIN"}
      </h1>
      <p className="mt-1 text-[15px] text-ink-secondary" aria-live="polite">
        {error ? <span className="text-danger">{error}</span> : checking ? "Checking…" : choosing ? "4 digits that only you know" : "Personal records are private"}
      </p>
      <div className={cn("my-6 flex gap-4", error && "animate-[shake_300ms]")} aria-label={`${pin.length} of 4 digits entered`} role="status">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("size-3.5 rounded-full border border-ink-tertiary", i < pin.length && "border-ink bg-ink")} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {keys.map((k) =>
          k === "" ? (
            <span key="blank" />
          ) : k === "del" ? (
            <button
              key="del"
              type="button"
              aria-label="Delete last digit"
              onClick={() => update(pinRef.current.slice(0, -1))}
              className="grid size-[72px] place-items-center rounded-full text-ink-secondary active:bg-hairline"
            >
              <Delete size={24} strokeWidth={1.75} aria-hidden />
            </button>
          ) : (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              className="grid size-[72px] place-items-center rounded-full bg-card text-[28px] text-ink shadow-card active:bg-hairline"
            >
              {k}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
