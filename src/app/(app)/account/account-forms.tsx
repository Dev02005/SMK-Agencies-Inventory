"use client";

import { LogOut } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { sampleSaveMessage, useToast } from "@/components/ui/toast";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="secondary" disabled={pending} onClick={() => startTransition(() => signOut())}>
      <LogOut size={16} strokeWidth={1.75} aria-hidden />
      {pending ? "Signing out…" : "Sign out now"}
    </Button>
  );
}

/** Checks the new password here; it is stored once Supabase Auth is connected. */
export function ChangePasswordForm() {
  const id = useId();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const nextError = !next ? undefined : next.length < 8 ? "Use at least 8 characters." : next === current ? "Choose a password different from the current one." : undefined;
  const againError = again && again !== next ? "The two new passwords don't match." : undefined;
  const ready = current.length > 0 && next.length > 0 && again === next && !nextError;

  const field = (key: string, label: string, value: string, set: (v: string) => void, autoComplete: string, error?: string) => (
    <Field label={label} htmlFor={`${id}-${key}`} error={error}>
      <input
        id={`${id}-${key}`}
        type="password"
        autoComplete={autoComplete}
        className={inputClass}
        value={value}
        onChange={(e) => set(e.target.value)}
        aria-invalid={error ? true : undefined}
      />
    </Field>
  );

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        toast(sampleSaveMessage("new password"));
        setCurrent("");
        setNext("");
        setAgain("");
      }}
    >
      <div className="sm:col-span-2">{field("current", "Current password", current, setCurrent, "current-password")}</div>
      {field("new", "New password", next, setNext, "new-password", nextError)}
      {field("again", "New password again", again, setAgain, "new-password", againError)}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={!ready}>
          Change password
        </Button>
      </div>
    </form>
  );
}
