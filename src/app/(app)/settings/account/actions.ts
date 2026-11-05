"use server";

import { cookies } from "next/headers";
import { getCurrentUser, getProfile, updateMyProfile } from "@/lib/data";
import { codeProblem } from "@/lib/password-rules";
import { checkPassword, setPassword } from "@/lib/passwords";
import { savePin } from "@/lib/personal-lock";
import { readSession, SESSION_COOKIE } from "@/lib/session";

export type ChangePasswordResult = { ok: true } | { ok: false; field: "current" | "next"; problem: string };

/** Changes the 6-digit code for signing in with a mobile number or email; needs the current one. */
export async function changePassword(current: string, next: string): Promise<ChangePasswordResult> {
  const session = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  const person = session ? await getProfile(session.userId) : undefined;
  if (!person) return { ok: false, field: "current", problem: "Your sign-in has ended. Sign in again." };
  if (typeof current !== "string" || typeof next !== "string" || !checkPassword(person, current)) {
    // Same short wait as a wrong sign-in, so this can't be used to guess codes quickly.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { ok: false, field: "current", problem: "That isn't your current code." };
  }
  const problem = next === current ? "Choose a code different from the current one." : codeProblem(next);
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

export type ProfileResult = { ok: true } | { ok: false; problem: string };

/** Changes the signed-in person's own name, as shown across the app (their sign-in and records stay the same). */
export async function changeMyName(name: string): Promise<ProfileResult> {
  const clean = typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
  if (clean.length < 2) return { ok: false, problem: "Enter your name." };
  if (clean.length > 60) return { ok: false, problem: "Use at most 60 characters." };
  if (!/\p{L}/u.test(clean)) return { ok: false, problem: "Use letters in your name." };
  await updateMyProfile({ name: clean });
  return { ok: true };
}

// A 256 × 256 JPEG from the browser is about 10–40 KB; this leaves room without letting large files in.
const MAX_PHOTO = 200_000;

/** Sets (a square JPEG data URL, made small in the browser) or removes (null) the signed-in person's photo. */
export async function changeMyPhoto(photo: string | null): Promise<ProfileResult> {
  if (photo === null) {
    await updateMyProfile({ photo: null });
    return { ok: true };
  }
  const prefix = "data:image/jpeg;base64,";
  if (typeof photo !== "string" || !photo.startsWith(prefix) || photo.length > MAX_PHOTO) return { ok: false, problem: "Choose a smaller photo." };
  const bytes = Buffer.from(photo.slice(prefix.length), "base64");
  // A real JPEG starts with FF D8 FF.
  if (bytes.length < 100 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return { ok: false, problem: "That file isn't a photo." };
  await updateMyProfile({ photo });
  return { ok: true };
}
