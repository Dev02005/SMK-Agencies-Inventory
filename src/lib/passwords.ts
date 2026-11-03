import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Profile } from "@/lib/data/types";
import { readRecord, saving, writeRecord } from "@/lib/data/store";
import { mobileOf } from "@/lib/mobile";

/**
 * Passwords people set for themselves (Settings › Account). Everyone starts with their mobile number. The ones they
 * set are kept as salted scrypt hashes, never the passwords, in the passwords.json record (store.ts: local-data/ on a
 * computer, Supabase online); deleting someone's line there puts them back on their mobile number.
 */
const FILE = "passwords.json";

function savedHashes(): Record<string, string> {
  const saved = (readRecord(FILE) as { passwords?: Record<string, unknown> } | undefined)?.passwords ?? {};
  return Object.fromEntries(Object.entries(saved).filter((e): e is [string, string] => typeof e[1] === "string" && e[1].includes(":")));
}

/** A salted scrypt hash ("salt:hash") of a password or PIN, so the secret itself is never kept. */
export function hashSecret(secret: string, salt = randomBytes(16).toString("hex")) {
  return `${salt}:${scryptSync(secret, salt, 32).toString("hex")}`;
}

/** Whether `secret` is the one `saved` (from hashSecret) was made from. */
export function hashMatches(secret: string, saved: string) {
  const x = Buffer.from(hashSecret(secret, saved.split(":")[0]));
  const y = Buffer.from(saved);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Whether `password` is this person's password: the one they set, or else their mobile number. */
export function checkPassword(person: Pick<Profile, "id" | "mobile">, password: string): boolean {
  const saved = savedHashes()[person.id];
  if (saved) return hashMatches(password, saved);
  // Until they set one, the password is their mobile number, typed with or without +91.
  const typed = mobileOf(password);
  return typed.length === 10 && typed === mobileOf(person.mobile);
}

export async function setPassword(userId: string, password: string) {
  const hashed = hashSecret(password);
  await saving(() =>
    writeRecord(FILE, {
      about: "Passwords people set for themselves, as salted hashes (never the passwords). Delete a line to put that person back on their mobile number.",
      passwords: { ...savedHashes(), [userId]: hashed },
    }),
  );
}
