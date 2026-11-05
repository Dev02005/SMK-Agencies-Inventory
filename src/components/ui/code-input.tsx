"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const CODE_LENGTH = 6;

type Props = Omit<ComponentProps<"input">, "type" | "value" | "onChange" | "maxLength" | "inputMode" | "pattern"> & {
  value: string;
  onValueChange: (code: string) => void;
  /** Called once all 6 digits are in, e.g. to sign in without pressing the button. */
  onComplete?: (code: string) => void;
  invalid?: boolean;
};

/**
 * A 6-digit code, shown as six boxes. Underneath is one ordinary numeric input laid over the boxes, so typing,
 * pasting, autofill, backspace and screen readers all work as they do in any text box. Digits show as dots until the
 * eye button is pressed.
 */
export function CodeInput({ value, onValueChange, onComplete, invalid, className, onFocus, onBlur, ...props }: Props) {
  const [shown, setShown] = useState(false);
  const [focused, setFocused] = useState(false);
  const digits = value.slice(0, CODE_LENGTH);
  const active = Math.min(digits.length, CODE_LENGTH - 1);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative min-w-0 flex-1">
        <div aria-hidden className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {Array.from({ length: CODE_LENGTH }, (_, i) => {
            const digit = digits[i];
            return (
              <span
                key={i}
                className={cn(
                  "grid h-12 min-w-0 place-items-center rounded-xl border bg-card text-[22px] font-semibold tabular-nums text-ink transition-colors",
                  invalid ? "border-danger" : focused && i === active ? "border-accent" : "border-divider",
                  focused && i === active && (invalid ? "ring-2 ring-danger/25" : "ring-2 ring-accent/25"),
                )}
              >
                {digit ? (
                  shown ? (
                    digit
                  ) : (
                    <span className="size-2.5 rounded-full bg-ink" />
                  )
                ) : focused && i === active ? (
                  <span className="h-6 w-px animate-pulse bg-ink" />
                ) : null}
              </span>
            );
          })}
        </div>
        <input
          {...props}
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={CODE_LENGTH}
          autoCapitalize="none"
          spellCheck={false}
          value={digits}
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH);
            onValueChange(next);
            if (next.length === CODE_LENGTH && next !== digits) onComplete?.(next);
          }}
          onFocus={(e) => {
            setFocused(true);
            // Keep the caret at the end, so typing always fills the next box.
            const end = e.target.value.length;
            e.target.setSelectionRange(end, end);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent opacity-0 outline-none"
        />
      </div>
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? "Hide code" : "Show code"}
        aria-pressed={shown}
        title={shown ? "Hide code" : "Show code"}
        className="grid size-10 shrink-0 place-items-center rounded-full text-ink-secondary hover:bg-hairline hover:text-ink"
      >
        {shown ? <EyeOff size={19} strokeWidth={1.75} aria-hidden /> : <Eye size={19} strokeWidth={1.75} aria-hidden />}
      </button>
    </div>
  );
}
