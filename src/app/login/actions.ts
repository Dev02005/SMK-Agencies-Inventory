"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PERSONAL_COOKIE } from "@/lib/personal-lock";
import { loginMatches, newSession, SESSION_COOKIE } from "@/lib/session";

/** Only paths inside this app, so a crafted link can't send someone to another site after signing in. */
const safeNext = (next: string | undefined) => (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/");

export async function signIn(id: string, password: string, next?: string): Promise<{ ok: false }> {
  if (typeof id !== "string" || typeof password !== "string" || !loginMatches(id.trim(), password)) {
    // A short wait on every wrong attempt makes guessing slow.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { ok: false };
  }
  const session = newSession("u-owner");
  (await cookies()).set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: session.expires,
  });
  redirect(safeNext(next));
}

/** Signs out (also re-locks Personal). "midnight" tells the sign-in page why. */
export async function signOut(reason?: "midnight") {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete({ name: PERSONAL_COOKIE, path: "/personal" });
  redirect(reason === "midnight" ? "/login?reason=midnight" : "/login");
}
