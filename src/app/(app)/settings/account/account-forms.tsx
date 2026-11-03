"use client";

import { LogOut } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { signOut } from "@/app/login/actions";
import { Button, IconButton } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { PasswordInput } from "@/components/ui/password-input";
import { passwordProblem } from "@/lib/password-rules";
import { forgetSignedIn } from "@/lib/roles";
import { usesSampleData } from "@/lib/supabase/config";
import { changePassword } from "./actions";

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
 * The password for signing in with a mobile number or email (the sample owner login 123456789 stays as it is).
 * Sample mode keeps it until the app restarts; with Supabase it is stored for good.
 */
export function ChangePasswordForm({ mobile }: { mobile: string }) {
  const id = useId();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [serverError, setServerError] = useState<{ field: "current" | "next"; problem: string }>();
  const [pending, startTransition] = useTransition();
  const nextError = !next ? undefined : next === current ? "Choose a password different from the current one." : passwordProblem(next, mobile);
  const againError = again && again !== next ? "The two new passwords don't match." : undefined;
  const ready = current.length > 0 && next.length > 0 && again === next && !nextError;

  const field = (key: string, label: string, value: string, set: (v: string) => void, autoComplete: string, error?: string) => (
    <Field label={label} htmlFor={`${id}-${key}`} error={error}>
      <PasswordInput
        id={`${id}-${key}`}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => {
          set(e.target.value);
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
          toast(usesSampleData ? "Password changed. In sample mode it lasts until the app restarts." : "Password changed.");
          setCurrent("");
          setNext("");
          setAgain("");
        });
      }}
    >
      <div className="sm:col-span-2">
        {field("current", "Current password", current, setCurrent, "current-password", serverError?.field === "current" ? serverError.problem : undefined)}
      </div>
      {field("new", "New password", next, setNext, "new-password", nextError ?? (serverError?.field === "next" ? serverError.problem : undefined))}
      {field("again", "New password again", again, setAgain, "new-password", againError)}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={!ready || pending}>
          {pending ? "Changing…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}
