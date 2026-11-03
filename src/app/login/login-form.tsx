"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { rememberSignedIn } from "@/lib/roles";
import { lookUpLogin, signIn } from "./actions";

type Person = { name: string; initials: string; designation: string };

/**
 * Two steps, on any phone or computer: the mobile number (or email) first, then, with the person greeted by the
 * name saved for that number, their password. The session lasts until 12 AM India time, then everyone signs in again.
 */
export function LoginForm() {
  const id = useId();
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [person, setPerson] = useState<Person | null>(null);
  const [password, setPassword] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function findPerson() {
    if (!loginId.trim() || pending) return;
    setProblem(null);
    startTransition(async () => {
      const result = await lookUpLogin(loginId);
      if (result.ok) setPerson({ name: result.name, initials: result.initials, designation: result.designation });
      else
        setProblem(
          result.reason === "too-many"
            ? "Too many tries from this device. Wait 10 minutes and try again."
            : "No one with that mobile number is on the staff list. Check the number, or ask the owner to add you.",
        );
    });
  }

  function signInNow() {
    if (!password || pending) return;
    setProblem(null);
    // Read here rather than with useSearchParams, so the form itself is part of the instant first paint.
    const next = new URLSearchParams(window.location.search).get("next") ?? undefined;
    startTransition(async () => {
      const result = await signIn(loginId, password, next);
      if (!result.ok) {
        setProblem("That password is wrong. Try again.");
        setPassword("");
        return;
      }
      // Their own role's screens from the first page.
      rememberSignedIn(result.user);
      router.replace(result.next);
    });
  }

  function notYou() {
    setPerson(null);
    setPassword("");
    setProblem(null);
  }

  return (
    <form
      className="surface space-y-4 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (person) signInNow();
        else findPerson();
      }}
    >
      <Suspense>
        <SignedOutNotice />
      </Suspense>

      {!person ? (
        <>
          <Field label="Mobile number" htmlFor={`${id}-login`} hint={problem ? undefined : "Or the email saved for you"} error={problem ?? undefined}>
            <input
              id={`${id}-login`}
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={100}
              placeholder="10-digit mobile number"
              className={inputClass}
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              aria-invalid={Boolean(problem) || undefined}
              autoFocus
            />
          </Field>
          <Button type="submit" disabled={!loginId.trim() || pending} className="w-full">
            {pending ? "Finding you…" : "Continue"}
          </Button>
        </>
      ) : (
        <>
          <div className="flex flex-col items-center gap-2 pb-1 text-center">
            <span aria-hidden className="grid size-16 place-items-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--teal))] text-[22px] font-semibold text-white shadow-card">
              {person.initials}
            </span>
            <div>
              <p className="text-[13px] text-ink-secondary">Welcome back</p>
              <p className="text-[20px] font-semibold tracking-[-0.3px] text-ink">{person.name}</p>
              {person.designation && <p className="text-[14px] font-medium text-accent">{person.designation}</p>}
              <p className="text-[13px] tabular-nums text-ink-secondary">{loginId.trim()}</p>
            </div>
            <button type="button" onClick={notYou} className="inline-flex items-center gap-1 text-[14px] text-link hover:underline">
              <ArrowLeft size={14} strokeWidth={2} aria-hidden /> Not you? Change number
            </button>
          </div>
          {/* Lets password managers file the password under the right login. */}
          <input type="text" name="username" autoComplete="username" value={loginId} readOnly hidden />
          <Field label="Password" htmlFor={`${id}-password`} error={problem ?? undefined}>
            <PasswordInput
              id={`${id}-password`}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(problem) || undefined}
              autoFocus
            />
          </Field>
          <Button type="submit" disabled={!password || pending} className="w-full">
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </>
      )}
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
