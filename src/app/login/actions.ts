"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/data/types";
import { findLogin, findPerson } from "@/lib/login";
import { PERSONAL_COOKIE } from "@/lib/personal-lock";
import { newSession, SESSION_COOKIE } from "@/lib/session";

/** Only paths inside this app, so a crafted link can't send someone to another site after signing in. */
const safeNext = (next: string | undefined) => (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/");

async function startSession(userId: string, role: Role) {
  const session = newSession(userId, role);
  (await cookies()).set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: session.expires,
  });
}

// Name look-ups per address in the last 10 minutes, so the staff list can't be read off number by number.
const lookups = new Map<string, number[]>();
const LOOKUP_LIMIT = 20;
const LOOKUP_WINDOW = 10 * 60_000;

export type LookUpResult = { ok: true; name: string; initials: string; designation: string } | { ok: false; reason: "unknown" | "too-many" };

/** Sign-in step 1: the name saved for this mobile number (or email), shown before asking for the password. */
export async function lookUpLogin(loginId: string): Promise<LookUpResult> {
  const from = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (lookups.get(from) ?? []).filter((at) => now - at < LOOKUP_WINDOW);
  if (from !== "local" && process.env.NODE_ENV === "production" && recent.length >= LOOKUP_LIMIT) return { ok: false, reason: "too-many" };
  lookups.set(from, [...recent, now]);

  const person = typeof loginId === "string" && loginId.length <= 100 ? await findPerson(loginId) : null;
  if (!person) {
    // The same short wait as a wrong password, so guessing numbers is slow.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { ok: false, reason: "unknown" };
  }
  return { ok: true, ...person };
}

export type SignInResult = { ok: false } | { ok: true; user: { id: string; role: Role }; next: string };

/** Mobile number or email, and password. The browser then opens `next` with the person's own screens. */
export async function signIn(loginId: string, password: string, next?: string): Promise<SignInResult> {
  const user = typeof loginId === "string" && typeof password === "string" ? await findLogin(loginId, password) : null;
  if (!user) {
    // A short wait on every wrong attempt makes guessing slow.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { ok: false };
  }
  await startSession(user.id, user.role as Role);
  return { ok: true, user: { id: user.id, role: user.role as Role }, next: safeNext(next) };
}

/** Signs out (also re-locks Personal). "midnight" tells the sign-in page why. */
export async function signOut(reason?: "midnight") {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete({ name: PERSONAL_COOKIE, path: "/personal" });
  redirect(reason === "midnight" ? "/login?reason=midnight" : "/login");
}
