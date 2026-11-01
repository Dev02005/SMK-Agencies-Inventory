"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/data";
import type { Role } from "@/lib/data/types";
import { findLogin } from "@/lib/login";
import { passwordProblem } from "@/lib/password-rules";
import { setPassword } from "@/lib/passwords";
import { PERSONAL_COOKIE } from "@/lib/personal-lock";
import { newSession, readSession, SESSION_COOKIE } from "@/lib/session";

/** Only paths inside this app, so a crafted link can't send someone to another site after signing in. */
const safeNext = (next: string | undefined) => (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/");

async function startSession(userId: string, mustChange: boolean) {
  const session = newSession(userId, mustChange);
  (await cookies()).set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: session.expires,
  });
}

export type SignInResult = { ok: false } | { ok: true; user: { id: string; role: Role }; next: string };

/**
 * Mobile number or email, and password. The browser then opens `next` with the person's own screens; someone who
 * used their starting password (their mobile number) first goes to set their own.
 */
export async function signIn(loginId: string, password: string, next?: string): Promise<SignInResult> {
  const user = typeof loginId === "string" && typeof password === "string" ? await findLogin(loginId, password) : null;
  if (!user) {
    // A short wait on every wrong attempt makes guessing slow.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { ok: false };
  }
  await startSession(user.id, user.mustChange);
  const then = safeNext(next);
  return {
    ok: true,
    user: { id: user.id, role: user.role as Role },
    next: user.mustChange ? `/login/new-password${then === "/" ? "" : `?next=${encodeURIComponent(then)}`}` : then,
  };
}

/** First sign-in: replaces the starting password and lets them into the app. */
export async function setFirstPassword(password: string, next?: string): Promise<{ ok: false; problem: string } | { ok: true; next: string }> {
  const session = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return { ok: false, problem: "Your sign-in has ended. Sign in again." };
  // Only straight after signing in with the starting password; later changes need the current password (Account page).
  if (!session.mustChange) return { ok: false, problem: "Your password is already set. Change it from the Account page." };
  const person = await getProfile(session.userId);
  const problem = typeof password !== "string" ? "Enter a password." : passwordProblem(password, person?.mobile);
  if (!person || problem) return { ok: false, problem: problem ?? "Sign in again." };
  setPassword(person.id, password);
  await startSession(person.id, false);
  return { ok: true, next: safeNext(next) };
}

/** Signs out (also re-locks Personal). "midnight" tells the sign-in page why. */
export async function signOut(reason?: "midnight") {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete({ name: PERSONAL_COOKIE, path: "/personal" });
  redirect(reason === "midnight" ? "/login?reason=midnight" : "/login");
}
