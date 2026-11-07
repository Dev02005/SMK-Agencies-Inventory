"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Info,
  LoaderCircle,
  Lock,
  Phone,
  Search,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useId, useRef, useState, useTransition } from "react";
import { CODE_LENGTH } from "@/lib/password-rules";
import { rememberSignedIn } from "@/lib/roles";
import type { Profile } from "@/lib/data/types";
import { lookUpLogin, signIn } from "./actions";

export type SignInPerson = Profile & { designation: string };

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1 && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
  return "SK";
}

export function LoginForm({ people }: { people: SignInPerson[] }) {
  const id = useId();
  const router = useRouter();

  // Step 1 = Enter mobile number & fetch account; Step 2 = Display confirmed name & enter 6-digit PIN
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 state: mobile number is primary
  const [mobileNumber, setMobileNumber] = useState("");
  const [useDirectoryView, setUseDirectoryView] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<SignInPerson | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Step 2 state: confirmed account fetched from database
  const [confirmedPerson, setConfirmedPerson] = useState<{
    name: string;
    initials: string;
    designation: string;
    loginId: string;
  } | null>(null);

  // Step 2 PIN state
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);
  const [showForgotNotice, setShowForgotNotice] = useState(false);

  const [pending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Check remembered mobile login on mount
  useEffect(() => {
    try {
      const remembered = localStorage.getItem("ska_remembered_login");
      if (remembered) {
        queueMicrotask(() => {
          setMobileNumber(remembered.replace(/\D/g, "").slice(-10) || remembered);
        });
      }
    } catch {
      // localStorage not available
    }
  }, []);

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  // Auto focus PIN when step 2 is active
  useEffect(() => {
    if (step === 2) {
      const timer = setTimeout(() => passwordInputRef.current?.focus(), 80);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => mobileInputRef.current?.focus(), 80);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Step 1: Look up account by mobile number from database
  function handleFetchAccount() {
    setProblem(null);

    // If using the staff directory picker
    if (useDirectoryView && selectedPerson) {
      setConfirmedPerson({
        name: selectedPerson.fullName,
        initials: getInitials(selectedPerson.fullName),
        designation: selectedPerson.designation || (selectedPerson.role === "owner" ? "Admin" : selectedPerson.role),
        loginId: selectedPerson.mobile || selectedPerson.fullName,
      });
      setStep(2);
      return;
    }

    const trimmed = mobileNumber.trim().replace(/[\s+-]/g, "");
    if (!trimmed) {
      setProblem("Please enter your registered 10-digit mobile number.");
      mobileInputRef.current?.focus();
      return;
    }

    if (trimmed.length < 5) {
      setProblem("Please enter a valid 10-digit mobile number.");
      mobileInputRef.current?.focus();
      return;
    }

    startTransition(async () => {
      const result = await lookUpLogin(trimmed);
      if (result.ok) {
        setConfirmedPerson({
          name: result.name,
          initials: result.initials,
          designation: result.designation,
          loginId: trimmed,
        });
        setStep(2);
      } else {
        setProblem(
          result.reason === "too-many"
            ? "Too many attempts from this device. Please wait 10 minutes."
            : `No staff account found for +91 ${trimmed}. Please check the number or contact Kamesh Potnuru.`,
        );
        mobileInputRef.current?.focus();
      }
    });
  }

  // Step 2: Sign in with 6-digit PIN
  function handleSignIn() {
    setProblem(null);
    if (!confirmedPerson) {
      setStep(1);
      return;
    }

    if (!password) {
      setProblem("Please enter your 6-digit PIN code.");
      passwordInputRef.current?.focus();
      return;
    }

    if (password.length !== CODE_LENGTH) {
      setProblem(`PIN code must be exactly ${CODE_LENGTH} digits. Default is 000000.`);
      passwordInputRef.current?.focus();
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next") ?? undefined;

    startTransition(async () => {
      const result = await signIn(confirmedPerson.loginId, password, next);
      if (!result.ok) {
        setProblem("That sign-in code is incorrect. Default code is 000000.");
        setPassword("");
        passwordInputRef.current?.focus();
        return;
      }

      try {
        if (rememberMe) {
          localStorage.setItem("ska_remembered_login", confirmedPerson.loginId);
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

  const filteredPeople = people.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.mobile.includes(q) ||
      (p.designation && p.designation.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full">
      {/* Title & Subtitle */}
      <div>
        <h1 className="font-serif text-[32px] sm:text-[38px] font-medium tracking-tight text-[#0f172a]">
          {step === 1 ? "Welcome back" : `Welcome back, ${confirmedPerson?.name.split(" ")[0]}`}
        </h1>
        <p className="mt-1.5 text-[14.5px] text-[#64748b]">
          {step === 1
            ? "Enter your registered mobile number to continue."
            : "Confirm your account and enter your 6-digit security PIN."}
        </p>
      </div>

      <Suspense>
        <SignedOutNotice />
      </Suspense>

      {/* Forgot Password guidance */}
      {showForgotNotice && (
        <div className="mt-5 rounded-2xl bg-[#0068d1]/10 border border-[#0068d1]/20 p-4 text-[13px] text-[#0f172a] flex items-start gap-3">
          <Info className="size-4.5 text-[#0068d1] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-[#0f172a]">Sign-in PIN Help</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#475569]">
              Default PIN for all accounts is <span className="font-mono font-bold text-[#0f172a]">000000</span>.
              If you updated your PIN and forgot it, please contact the proprietor (Kamesh Potnuru) to reset it.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForgotNotice(false)}
            className="text-[#94a3b8] hover:text-[#0f172a] p-0.5 cursor-pointer"
            aria-label="Dismiss notice"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Problem error banner */}
      {problem && (
        <div
          role="alert"
          className="mt-5 rounded-2xl bg-danger-soft border border-danger/20 px-4 py-3 text-[13.5px] text-danger flex items-center gap-2.5"
        >
          <AlertCircle className="size-4.5 shrink-0" />
          <span>{problem}</span>
        </div>
      )}

      {/* STEP 1: Enter Mobile Number & Fetch Account */}
      {step === 1 ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleFetchAccount();
          }}
          className="mt-7 space-y-5"
        >
          {!useDirectoryView ? (
            /* Primary Mobile Number Input */
            <div>
              <label
                htmlFor={`${id}-mobile`}
                className="block text-[11px] font-bold tracking-[0.1em] text-[#64748b] uppercase mb-2"
              >
                REGISTERED MOBILE NUMBER
              </label>

              <div className="relative">
                <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[#64748b] font-medium text-[15px]">
                  <Phone className="size-[17px] text-[#94a3b8]" />
                  <span>+91</span>
                </div>
                <input
                  id={`${id}-mobile`}
                  ref={mobileInputRef}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={mobileNumber}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setMobileNumber(cleaned);
                    if (problem) setProblem(null);
                  }}
                  placeholder="Enter 10-digit mobile number"
                  className="h-[52px] w-full rounded-2xl border border-[#e2e8f0] bg-white pl-20 pr-4 text-[16px] text-[#0f172a] font-medium tracking-wide shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:border-[#0068d1] focus:ring-2 focus:ring-[#0068d1]/15 focus:outline-none transition-all"
                  autoFocus
                />
              </div>

              <div className="mt-2 flex justify-between items-center text-[12px] px-1">
                <span className="text-[#94a3b8]">Owner / Staff 10-digit number</span>
                <button
                  type="button"
                  onClick={() => {
                    setUseDirectoryView(true);
                    setSelectedPerson(people[0] ?? null);
                    if (problem) setProblem(null);
                  }}
                  className="font-medium text-[#0068d1] hover:underline cursor-pointer"
                >
                  Or pick from staff directory →
                </button>
              </div>
            </div>
          ) : (
            /* Secondary Directory Dropdown View */
            <div className="relative" ref={dropdownRef}>
              <label
                className="block text-[11px] font-bold tracking-[0.1em] text-[#64748b] uppercase mb-2"
              >
                SELECT STAFF ACCOUNT
              </label>

              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="h-[52px] w-full rounded-2xl border border-[#e2e8f0] bg-white px-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-[#cbd5e1] focus:border-[#0068d1] focus:ring-2 focus:ring-[#0068d1]/15 transition-all flex items-center justify-between gap-3 cursor-pointer"
                aria-expanded={isDropdownOpen}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <User className="size-[19px] text-[#94a3b8] shrink-0" aria-hidden />
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="text-[15px] font-medium text-[#0f172a] truncate">
                      {selectedPerson ? selectedPerson.fullName : "Choose staff account"}
                    </span>
                    {selectedPerson?.designation && (
                      <span className="shrink-0 text-[11.5px] font-semibold text-[#0068d1] bg-[#0068d1]/10 px-2 py-0.5 rounded-full">
                        {selectedPerson.designation}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDown
                  className={`size-[17px] text-[#94a3b8] shrink-0 transition-transform duration-200 ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden
                />
              </button>

              {/* Dropdown menu */}
              {isDropdownOpen && (
                <div className="absolute z-30 mt-1.5 w-full rounded-2xl border border-[#e2e8f0] bg-white shadow-xl overflow-hidden animate-fade-up">
                  {people.length > 5 && (
                    <div className="p-2 border-b border-[#f1f5f9]">
                      <div className="relative flex items-center">
                        <Search className="size-4 text-[#94a3b8] absolute left-3 pointer-events-none" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search staff name..."
                          className="w-full h-9 pl-9 pr-3 text-[13.5px] rounded-xl bg-[#f8fafc] border border-transparent focus:border-[#0068d1]/30 focus:outline-none"
                          autoFocus
                        />
                      </div>
                    </div>
                  )}

                  <ul className="max-h-[260px] overflow-y-auto divide-y divide-[#f8fafc] p-1.5" role="listbox">
                    {filteredPeople.map((p) => {
                      const isSelected = selectedPerson?.id === p.id;
                      return (
                        <li
                          key={p.id}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            setSelectedPerson(p);
                            setIsDropdownOpen(false);
                            setSearchQuery("");
                            if (problem) setProblem(null);
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                            isSelected ? "bg-[#0068d1]/10 text-[#0068d1]" : "hover:bg-[#f8fafc] text-[#0f172a]"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="grid size-8 place-items-center rounded-full bg-gradient-to-tr from-[#0068d1] to-[#38bdf8] text-[12px] font-bold text-white shrink-0">
                              {getInitials(p.fullName)}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[14px] font-medium truncate">{p.fullName}</p>
                              <p className="text-[11.5px] text-[#64748b]">
                                {p.designation || (p.role === "owner" ? "Admin" : p.role)} · {p.mobile}
                              </p>
                            </div>
                          </div>
                          {isSelected && <Check className="size-4 text-[#0068d1] shrink-0" />}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="mt-2 flex justify-end text-[12px] px-1">
                <button
                  type="button"
                  onClick={() => {
                    setUseDirectoryView(false);
                    if (problem) setProblem(null);
                  }}
                  className="font-medium text-[#0068d1] hover:underline cursor-pointer"
                >
                  ← Back to mobile number entry
                </button>
              </div>
            </div>
          )}

          {/* CONTINUE BUTTON */}
          <button
            type="submit"
            disabled={pending || (!useDirectoryView && mobileNumber.trim().length < 5)}
            className="w-full h-[50px] rounded-2xl bg-[#0c192c] hover:bg-[#15253e] active:scale-[0.99] text-white font-semibold text-[15px] shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {pending ? (
              <>
                <LoaderCircle className="size-4.5 animate-spin" />
                <span>Fetching account from database…</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="size-4.5" />
              </>
            )}
          </button>
        </form>
      ) : (
        /* STEP 2: Confirmed Account Fetched from Database + Enter PIN */
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSignIn();
          }}
          className="mt-6 space-y-5"
        >
          {/* Confirmed Person Card from Database */}
          {confirmedPerson && (
            <div className="rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] p-4 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="grid size-11 place-items-center rounded-full bg-gradient-to-tr from-[#0068d1] via-[#0284c7] to-[#38bdf8] text-[14px] font-bold text-white shrink-0 shadow-sm">
                  {confirmedPerson.initials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-bold text-[#0f172a] truncate">
                      {confirmedPerson.name}
                    </p>
                    <ShieldCheck className="size-4 text-[#10b981] shrink-0" aria-label="Verified staff" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    {confirmedPerson.designation && (
                      <span className="text-[11px] font-semibold text-[#0068d1] bg-[#0068d1]/10 px-2 py-0.5 rounded-full">
                        {confirmedPerson.designation}
                      </span>
                    )}
                    <span className="text-[12px] text-[#64748b] truncate">
                      +91 {confirmedPerson.loginId}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setPassword("");
                  setProblem(null);
                }}
                className="text-[12px] font-semibold text-[#0068d1] hover:underline cursor-pointer shrink-0 px-2.5 py-1.5 rounded-lg hover:bg-[#0068d1]/5"
              >
                Change
              </button>
            </div>
          )}

          {/* 6-DIGIT PIN INPUT */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor={`${id}-password`}
                className="text-[11px] font-bold tracking-[0.1em] text-[#64748b] uppercase"
              >
                6-DIGIT SIGN-IN PIN
              </label>
              <span className="text-[11px] text-[#94a3b8] font-medium">Default: 000000</span>
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-[19px] text-[#94a3b8]" />
              <input
                id={`${id}-password`}
                ref={passwordInputRef}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH);
                  setPassword(val);
                  if (problem) setProblem(null);
                }}
                placeholder="••••••"
                maxLength={CODE_LENGTH}
                inputMode="numeric"
                autoComplete="current-password"
                className="h-[52px] w-full rounded-2xl border border-[#e2e8f0] bg-white pl-11 pr-12 text-[18px] text-[#0f172a] tracking-widest font-mono shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:border-[#0068d1] focus:ring-2 focus:ring-[#0068d1]/15 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide PIN" : "Show PIN"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#475569] p-1 cursor-pointer transition-colors"
              >
                {showPassword ? <EyeOff className="size-[19px]" /> : <Eye className="size-[19px]" />}
              </button>
            </div>
          </div>

          {/* REMEMBER ME & FORGOT PIN */}
          <div className="flex items-center justify-between text-[13px] pt-1">
            <label className="flex items-center gap-2 text-[#475569] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-4 rounded border-[#cbd5e1] text-[#0068d1] accent-[#0068d1] focus:ring-[#0068d1] cursor-pointer"
              />
              <span className="text-[13.5px]">Remember me</span>
            </label>
            <button
              type="button"
              onClick={() => setShowForgotNotice(true)}
              className="font-medium text-[#0068d1] hover:underline focus:outline-none cursor-pointer text-[13px]"
            >
              Forgot PIN?
            </button>
          </div>

          {/* SIGN IN BUTTON */}
          <button
            type="submit"
            disabled={pending || password.length !== CODE_LENGTH}
            className="w-full h-[50px] rounded-2xl bg-[#0c192c] hover:bg-[#15253e] active:scale-[0.99] text-white font-semibold text-[15px] shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {pending ? (
              <>
                <LoaderCircle className="size-4.5 animate-spin" />
                <span>Signing in…</span>
              </>
            ) : (
              <span>Sign in</span>
            )}
          </button>

          {/* Back button */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setPassword("");
                setProblem(null);
              }}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#64748b] hover:text-[#0f172a] cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to change mobile number</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function SignedOutNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("reason") !== "midnight") return null;
  return (
    <div
      role="status"
      className="mt-4 rounded-2xl bg-warning-soft border border-warning/20 px-4 py-2.5 text-[13px] text-warning"
    >
      It&apos;s past 12 midnight, so your session expired. Please sign in again.
    </div>
  );
}
