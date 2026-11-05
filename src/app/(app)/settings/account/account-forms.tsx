"use client";

import { LogOut } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { signOut } from "@/app/login/actions";
import { Button, IconButton } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { PasswordInput } from "@/components/ui/password-input";
import { CODE_LENGTH, codeProblem, isCode } from "@/lib/password-rules";
import { forgetSignedIn } from "@/lib/roles";
import { changePassword, changePersonalPin } from "./actions";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <IconButton
      label={pending ? "Signing out" : "Sign out now"}
      disabled={pending}
      onClick={() => {
        forgetSignedIn();
        startTransition(() => signOut());
      }}
    >
      <LogOut size={19} strokeWidth={1.9} aria-hidden />
    </IconButton>
  );
}

/**
 * The 6-digit code for signing in with a mobile number or email. It is kept (hashed) in the login-codes record, in
 * Supabase online; once it is set 000000 no longer works.
 */
export function ChangePasswordForm() {
  const id = useId();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [serverError, setServerError] = useState<{ field: "current" | "next"; problem: string }>();
  const [pending, startTransition] = useTransition();
  const nextError =
    next.length < CODE_LENGTH ? undefined : next === current ? "Choose a code different from the current one." : codeProblem(next);
  const againError = again.length === CODE_LENGTH && again !== next ? "The two new codes don't match." : undefined;
  const ready = isCode(current) && isCode(next) && again === next && !nextError;

  const field = (key: string, label: string, value: string, set: (v: string) => void, autoComplete: string, error?: string) => (
    <Field label={label} htmlFor={`${id}-${key}`} error={error}>
      <PasswordInput
        id={`${id}-${key}`}
        autoComplete={autoComplete}
        inputMode="numeric"
        maxLength={CODE_LENGTH}
        placeholder="6 digits"
        className="tabular-nums tracking-[0.3em]"
        value={value}
        onChange={(e) => {
          set(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH));
          setServerError(undefined);
        }}
        aria-invalid={error ? true : undefined}
      />
    </Field>
  );

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready || pending) return;
        startTransition(async () => {
          const result = await changePassword(current, next);
          if (!result.ok) {
            setServerError(result);
            return;
          }
          toast("Sign-in code changed.");
          setCurrent("");
          setNext("");
          setAgain("");
        });
      }}
    >
      <div className="sm:col-span-2">
        {field("current", "Current code", current, setCurrent, "current-password", serverError?.field === "current" ? serverError.problem : undefined)}
      </div>
      {field("new", "New 6-digit code", next, setNext, "new-password", nextError ?? (serverError?.field === "next" ? serverError.problem : undefined))}
      {field("again", "New code again", again, setAgain, "new-password", againError)}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={!ready || pending}>
          {pending ? "Changing…" : "Change code"}
        </Button>
      </div>
    </form>
  );
}

/** The owner's Personal PIN: 4 digits, kept (hashed) in the records; needs the current one. */
export function ChangePinForm() {
  const id = useId();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [serverError, setServerError] = useState<{ field: "current" | "next"; problem: string }>();
  const [pending, startTransition] = useTransition();
  const nextError = !next ? undefined : !/^\d{4}$/.test(next) ? "Use 4 digits." : next === current ? "Choose a PIN different from the current one." : undefined;
  const againError = again && again !== next ? "The two new PINs don't match." : undefined;
  const ready = /^\d{4}$/.test(current) && /^\d{4}$/.test(next) && again === next && !nextError;

  const field = (key: string, label: string, value: string, set: (v: string) => void, error?: string) => (
    <Field label={label} htmlFor={`${id}-${key}`} error={error}>
      <PasswordInput
        id={`${id}-${key}`}
        autoComplete="off"
        inputMode="numeric"
        maxLength={4}
        value={value}
        onChange={(e) => {
          set(e.target.value.replace(/\D/g, ""));
          setServerError(undefined);
        }}
        aria-invalid={error ? true : undefined}
      />
    </Field>
  );

  return (
    <form
      className="grid gap-4 sm:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready || pending) return;
        startTransition(async () => {
          const result = await changePersonalPin(current, next);
          if (!result.ok) {
            setServerError(result);
            return;
          }
          toast("Personal PIN changed.");
          setCurrent("");
          setNext("");
          setAgain("");
        });
      }}
    >
      {field("current", "Current PIN", current, setCurrent, serverError?.field === "current" ? serverError.problem : undefined)}
      {field("new", "New PIN", next, setNext, nextError ?? (serverError?.field === "next" ? serverError.problem : undefined))}
      {field("again", "New PIN again", again, setAgain, againError)}
      <div className="sm:col-span-3">
        <Button type="submit" disabled={!ready || pending}>
          {pending ? "Changing…" : "Change PIN"}
        </Button>
      </div>
    </form>
  );
}
