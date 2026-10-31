"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { AffixInput, Field, inputClass } from "@/components/ui/field";

/** Mobile number + password, as planned for staff logins. In sample mode any details sign you in. */
export function LoginForm() {
  const id = useId();
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const valid = /^\d{10}$/.test(mobile) && password.length > 0;

  return (
    <form
      className="surface space-y-4 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) router.push("/");
      }}
    >
      <Field label="Mobile number" htmlFor={`${id}-mobile`}>
        <AffixInput
          id={`${id}-mobile`}
          prefix="+91"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={10}
          value={mobile}
          onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
          className="pl-14"
        />
      </Field>
      <Field label="Password" htmlFor={`${id}-password`}>
        <input
          id={`${id}-password`}
          type="password"
          autoComplete="current-password"
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Button type="submit" disabled={!valid} className="w-full">
        Sign in
      </Button>
      <p className="text-center text-[13px] text-ink-secondary">
        Forgot your password? Ask the owner to reset it from Settings.
      </p>
    </form>
  );
}
