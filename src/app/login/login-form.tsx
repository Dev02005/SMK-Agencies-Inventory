"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Handshake,
  Info,
  ShieldCheck,
  Truck,
  User,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useId, useRef, useState, useTransition } from "react";
import { CODE_LENGTH, CodeInput } from "@/components/ui/code-input";
import { rememberSignedIn } from "@/lib/roles";
import { lookUpLogin, signIn } from "./actions";

type Person = { name: string; initials: string; designation: string };

export function LoginForm() {
  const id = useId();
  const router = useRouter();

  const [loginId, setLoginId] = useState("");
  const [person, setPerson] = useState<Person | null>(null);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);
  const [showForgotNotice, setShowForgotNotice] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function findPerson() {
    const trimmed = loginId.trim();
    if (!trimmed || pending) return;
    setProblem(null);

    startTransition(async () => {
      const result = await lookUpLogin(trimmed);
      if (result.ok) {
        setPerson({
          name: result.name,
          initials: result.initials,
          designation: result.designation,
        });
        // Auto focus the code input in next frame
        setTimeout(() => codeRef.current?.focus(), 50);
      } else {
        setProblem(
          result.reason === "too-many"
            ? "Too many attempts from this device. Please wait 10 minutes and try again."
            : "No user found with that mobile number. Please check the number or contact the owner.",
        );
      }
    });
  }

  function signInNow(code = password) {
    if (code.length !== CODE_LENGTH || pending) return;
    setProblem(null);
    const next = new URLSearchParams(window.location.search).get("next") ?? undefined;

    startTransition(async () => {
      const result = await signIn(loginId.trim(), code, next);
      if (!result.ok) {
        setProblem("That sign-in code is incorrect. Default is 000000.");
        setPassword("");
        codeRef.current?.focus();
        return;
      }

      try {
        if (rememberMe) {
          localStorage.setItem("ska_remembered_login", loginId.trim());
        } else {
          localStorage.removeItem("ska_remembered_login");
        }
      } catch {
        // localStorage not available
      }

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
    <div className="w-full">
      {/* Official Sri Kameswari Agencies Logo */}
      <div className="flex flex-col items-center text-center">
        <Image
          src="/logo.png"
          alt="Sri Kameswari Agencies"
          width={240}
          height={102}
          priority
          className="h-auto w-48 sm:w-56 object-contain"
        />
        <p className="mt-2 text-[11px] font-semibold tracking-[0.2em] text-ink-secondary uppercase">
          Cement • Steel • Stronger Tomorrow
        </p>
      </div>

      <Suspense>
        <SignedOutNotice />
      </Suspense>

      {/* Forgot Password guidance */}
      {showForgotNotice && (
        <div className="mt-4 rounded-2xl bg-accent-soft/70 border border-accent/20 p-3.5 text-[13px] text-ink flex items-start gap-2.5">
          <Info className="size-4.5 text-accent shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-ink">Sign-in Code Help</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-ink-secondary">
              Default code for all staff accounts is <span className="font-mono font-semibold text-ink">000000</span>.
              If you changed your code and forgot it, please contact the administrator to reset it.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForgotNotice(false)}
            className="text-ink-tertiary hover:text-ink p-0.5"
            aria-label="Dismiss notice"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Problem message */}
      {problem && (
        <div
          role="alert"
          className="mt-4 rounded-2xl bg-danger-soft border border-danger/20 px-3.5 py-2.5 text-[13px] text-danger flex items-center gap-2"
        >
          <AlertCircle className="size-4.5 shrink-0" />
          <span>{problem}</span>
        </div>
      )}

      {/* Main 2-Step Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (person) signInNow();
          else findPerson();
        }}
        className="mt-6 space-y-4"
      >
        {!person ? (
          /* Step 1: User enters phone number */
          <>
            <div>
              <label
                htmlFor={`${id}-login`}
                className="block text-[13px] font-medium text-ink-secondary mb-1.5"
              >
                Mobile number
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-ink-tertiary" aria-hidden />
                <input
                  id={`${id}-login`}
                  type="text"
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={100}
                  value={loginId}
                  onChange={(e) => {
                    setLoginId(e.target.value);
                    if (problem) setProblem(null);
                  }}
                  placeholder="Enter 10-digit mobile number"
                  className="h-12 w-full rounded-2xl border border-hairline bg-card pl-10 pr-4 text-[14.5px] text-ink placeholder:text-ink-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all focus:border-accent focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-accent/20"
                  style={{ outline: "none" }}
                  autoFocus
                />
              </div>
              <p className="mt-1.5 px-1 text-[12px] text-ink-tertiary">
                Enter your registered staff mobile number or username
              </p>
            </div>

            <div className="flex items-center justify-between text-[13px] px-0.5 pt-0.5">
              <label className="flex items-center gap-2 text-ink-secondary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-4 rounded border-divider text-accent accent-accent focus:ring-accent"
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgotNotice(true)}
                className="font-medium text-link hover:underline focus:outline-none"
              >
                Forgot code?
              </button>
            </div>

            <button
              type="submit"
              disabled={!loginId.trim() || pending}
              className="w-full h-12 rounded-2xl bg-accent hover:bg-accent/90 active:scale-[0.99] text-white font-semibold text-[15px] flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <span>{pending ? "Finding user…" : "Continue"}</span>
              {!pending && <ArrowRight className="size-4.5 stroke-[2.5]" aria-hidden />}
            </button>
          </>
        ) : (
          /* Step 2: User found! Displays name, designation, and prompts for 6-digit PIN */
          <>
            {/* User Profile Card */}
            <div className="rounded-2xl bg-card-subtle border border-hairline p-4 text-center">
              <div className="flex flex-col items-center">
                <span
                  aria-hidden
                  className="grid size-14 place-items-center rounded-full bg-gradient-to-tr from-accent to-teal text-[20px] font-bold text-white shadow-sm"
                >
                  {person.initials}
                </span>
                <p className="mt-2 text-[12px] font-medium text-ink-secondary">Welcome back</p>
                <h2 className="text-[19px] font-semibold text-ink tracking-tight">{person.name}</h2>
                {person.designation && (
                  <span className="mt-1 inline-flex items-center rounded-full bg-accent-soft px-2.5 py-0.5 text-[12px] font-semibold text-accent">
                    {person.designation}
                  </span>
                )}
                <p className="mt-1 text-[13px] tabular-nums text-ink-tertiary">{loginId.trim()}</p>

                <button
                  type="button"
                  onClick={notYou}
                  className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-link hover:underline"
                >
                  <ArrowLeft size={14} strokeWidth={2} aria-hidden />
                  <span>Not you? Change number</span>
                </button>
              </div>
            </div>

            {/* Hidden field for password managers */}
            <input type="text" name="username" autoComplete="username" value={loginId} readOnly hidden />

            {/* 6-Digit PIN input boxes */}
            <div>
              <div className="flex items-center justify-between mb-1.5 px-1">
                <label htmlFor={`${id}-code`} className="text-[13px] font-medium text-ink-secondary">
                  6-digit sign-in code
                </label>
                <span className="text-[12px] text-ink-tertiary">Default: 000000</span>
              </div>

              <CodeInput
                id={`${id}-code`}
                ref={codeRef}
                autoComplete="current-password"
                value={password}
                onValueChange={(code) => {
                  setPassword(code);
                  if (problem) setProblem(null);
                }}
                onComplete={(code) => signInNow(code)}
                invalid={Boolean(problem)}
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between text-[13px] px-0.5 pt-0.5">
              <span className="text-[12px] text-ink-tertiary">Enter your 6-digit PIN</span>
              <button
                type="button"
                onClick={() => setShowForgotNotice(true)}
                className="font-medium text-link hover:underline focus:outline-none"
              >
                Forgot code?
              </button>
            </div>

            <button
              type="submit"
              disabled={password.length !== CODE_LENGTH || pending}
              className="w-full h-12 rounded-2xl bg-accent hover:bg-accent/90 active:scale-[0.99] text-white font-semibold text-[15px] flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <span>{pending ? "Signing in…" : "Sign in"}</span>
              {!pending && <ArrowRight className="size-4.5 stroke-[2.5]" aria-hidden />}
            </button>
          </>
        )}
      </form>

      {/* Service Pillars / Badges */}
      <div className="mt-7 grid grid-cols-3 gap-2 pt-5 border-t border-hairline text-center">
        <div className="flex flex-col items-center">
          <div className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent mb-1.5">
            <Truck size={17} strokeWidth={2.2} />
          </div>
          <span className="text-[10px] font-bold tracking-wider text-ink-secondary uppercase leading-[13px]">
            Timely<br />Delivery
          </span>
        </div>
        <div className="flex flex-col items-center border-x border-hairline">
          <div className="grid size-9 place-items-center rounded-xl bg-teal-soft text-teal mb-1.5">
            <ShieldCheck size={17} strokeWidth={2.2} />
          </div>
          <span className="text-[10px] font-bold tracking-wider text-ink-secondary uppercase leading-[13px]">
            Quality<br />Products
          </span>
        </div>
        <div className="flex flex-col items-center">
          <div className="grid size-9 place-items-center rounded-xl bg-purple-soft text-purple mb-1.5">
            <Handshake size={17} strokeWidth={2.2} />
          </div>
          <span className="text-[10px] font-bold tracking-wider text-ink-secondary uppercase leading-[13px]">
            Strong<br />Relations
          </span>
        </div>
      </div>
    </div>
  );
}

function SignedOutNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("reason") !== "midnight") return null;
  return (
    <div
      role="status"
      className="mt-4 rounded-2xl bg-warning-soft border border-warning/20 px-3.5 py-2.5 text-[13px] text-warning"
    >
      It&apos;s past 12 midnight, so your session expired. Please sign in again.
    </div>
  );
}
