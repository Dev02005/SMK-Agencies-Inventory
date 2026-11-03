"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { MIN_PASSWORD, passwordProblem } from "@/lib/password-rules";
import { forgetSignedIn } from "@/lib/roles";
import { setFirstPassword, signOut } from "../actions";

export function NewPasswordForm() {
  const id = useId();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [serverProblem, setServerProblem] = useState<string>();
  const [pending, startTransition] = useTransition();
  // The server also refuses the mobile number itself; here the length check is enough for instant feedback.
  const problem = password ? passwordProblem(password) : undefined;
  const mismatch = again && again !== password ? "The two passwords don't match." : undefined;
  const ready = password.length > 0 && again === password && !problem;

  return (
    <form
      className="surface space-y-4 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready || pending) return;
        setServerProblem(undefined);
        const next = new URLSearchParams(window.location.search).get("next") ?? undefined;
        startTransition(async () => {
          const result = await setFirstPassword(password, next);
          if (!result.ok) {
            setServerProblem(result.problem);
            return;
          }
          router.replace(result.next);
        });
      }}
    >
      <Field label="New password" htmlFor={`${id}-new`} hint={`At least ${MIN_PASSWORD} characters, not your mobile number`} error={problem ?? serverProblem}>
        <PasswordInput
          id={`${id}-new`}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={problem || serverProblem ? true : undefined}
        />
      </Field>
      <Field label="New password again" htmlFor={`${id}-again`} error={mismatch}>
        <PasswordInput
          id={`${id}-again`}
          autoComplete="new-password"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
          aria-invalid={mismatch ? true : undefined}
        />
      </Field>
      <Button type="submit" disabled={!ready || pending} className="w-full">
        {pending ? "Saving…" : "Save and continue"}
      </Button>
      <Button
        variant="plain"
        className="w-full"
        onClick={() => {
          forgetSignedIn();
          void signOut();
        }}
      >
        Not you? Sign out
      </Button>
    </form>
  );
}
