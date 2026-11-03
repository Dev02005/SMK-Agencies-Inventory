"use server";

import { cookies } from "next/headers";
import { getCurrentUser, getProfile } from "@/lib/data";
import { passwordProblem } from "@/lib/password-rules";
import { checkPassword, setPassword } from "@/lib/passwords";
import { savePin } from "@/lib/personal-lock";
import { readSession, SESSION_COOKIE } from "@/lib/session";

export type ChangePasswordResult = { ok: true } | { ok: false; field: "current" | "next"; problem: string };

/** Changes the password for signing in with a mobile number or email; needs the current one. */
export async function changePassword(current: string, next: string): Promise<ChangePasswordResult> {
  const session = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  const person = session ? await getProfile(session.userId) : undefined;
  if (!person) return { ok: false, field: "current", problem: "Your sign-in has ended. Sign in again." };
  if (typeof current !== "string" || typeof next !== "string" || !checkPassword(person, current)) {
    // Same short wait as a wrong sign-in, so this can't be used to guess passwords quickly.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { ok: false, field: "current", problem: "That isn't your current password." };
  }
  const problem = next === current ? "Choose a password different from the current one." : passwordProblem(next, person.mobile);
  if (problem) return { ok: false, field: "next", problem };
  await setPassword(person.id, next);
  return { ok: true };
}

/** Changes the owner's Personal PIN; needs the current one. */
export async function changePersonalPin(current: string, next: string): Promise<ChangePasswordResult> {
  if ((await getCurrentUser()).role !== "owner") return { ok: false, field: "current", problem: "Only the owner has a Personal PIN." };
  if (typeof next !== "string" || !/^\d{4}$/.test(next)) return { ok: false, field: "next", problem: "Use 4 digits." };
  if (typeof current !== "string" || !(await savePin(next, current))) {
    // Same short wait as a wrong PIN on Personal.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { ok: false, field: "current", problem: "That isn't your current PIN." };
  }
  return { ok: true };
}
