"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";

/** A password box with an eye button to show or hide what was typed. */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input type={shown ? "text" : "password"} className={cn(inputClass, "pr-12", className)} autoCapitalize="none" spellCheck={false} {...props} />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        title={shown ? "Hide password" : "Show password"}
        className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-ink-secondary hover:bg-hairline hover:text-ink"
      >
        {shown ? <EyeOff size={19} strokeWidth={1.75} aria-hidden /> : <Eye size={19} strokeWidth={1.75} aria-hidden />}
      </button>
    </div>
  );
}
