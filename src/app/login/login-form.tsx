"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { signIn } from "./actions";

/** Login ID + password. The session lasts until 12 AM India time, then everyone signs in again. */
export function LoginForm() {
  const id = useId();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [wrong, setWrong] = useState(false);
  const [pending, startTransition] = useTransition();
  const valid = loginId.length > 0 && password.length > 0;

  return (
    <form
      className="surface space-y-4 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid || pending) return;
        setWrong(false);
        // Read here rather than with useSearchParams, so the form itself is part of the instant first paint.
        const next = new URLSearchParams(window.location.search).get("next") ?? undefined;
        startTransition(async () => {
          const result = await signIn(loginId, password, next);
          if (result && !result.ok) {
            setWrong(true);
            setPassword("");
          }
        });
      }}
    >
      <Suspense>
        <SignedOutNotice />
      </Suspense>
      <Field label="Login ID" htmlFor={`${id}-login`}>
        <input
          id={`${id}-login`}
          inputMode="numeric"
          autoComplete="username"
          maxLength={10}
          className={`${inputClass} tabular-nums`}
          value={loginId}
          onChange={(e) => setLoginId(e.target.value.replace(/\D/g, ""))}
          aria-invalid={wrong || undefined}
        />
      </Field>
      <Field label="Password" htmlFor={`${id}-password`} error={wrong ? "That login ID or password is wrong. Try again." : undefined}>
        <input
          id={`${id}-password`}
          type="password"
          autoComplete="current-password"
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={wrong || undefined}
        />
      </Field>
      <Button type="submit" disabled={!valid || pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-[13px] text-ink-secondary">You stay signed in until 12 midnight.</p>
    </form>
  );
}

function SignedOutNotice() {
  if (useSearchParams().get("reason") !== "midnight") return null;
  return (
    <p role="status" className="rounded-xl bg-accent-soft px-3.5 py-2.5 text-[14px] text-ink">
      It&apos;s past 12 midnight, so you were signed out. Sign in again to carry on.
    </p>
  );
}
