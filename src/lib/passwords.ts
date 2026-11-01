import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Profile } from "@/lib/data/types";

/**
 * Passwords people set for themselves. Everyone starts with their mobile number and must replace it on their first
 * sign-in. Sample mode keeps the new passwords (salted scrypt hashes, never the passwords) in the server's memory,
 * so they last until the server restarts; with Supabase, Supabase Auth stores them.
 */
const store = ((globalThis as { __skaPasswords?: Map<string, string> }).__skaPasswords ??= new Map<string, string>());

function hash(password: string, salt = randomBytes(16).toString("hex")) {
  return `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Whether `password` is this person's password, and whether it is still the starting one (their mobile number). */
export function checkPassword(person: Pick<Profile, "id" | "mobile">, password: string): { ok: boolean; starting: boolean } {
  const saved = store.get(person.id);
  if (saved) return { ok: same(hash(password, saved.split(":")[0]), saved), starting: false };
  return { ok: same(password, person.mobile), starting: true };
}

export function setPassword(userId: string, password: string) {
  store.set(userId, hash(password));
}
