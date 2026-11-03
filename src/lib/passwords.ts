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

function hash(password: string, salt = randomBytes(16).toString("hex")) {
  return `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Whether `password` is this person's password: the one they set, or else their mobile number. */
export function checkPassword(person: Pick<Profile, "id" | "mobile">, password: string): boolean {
  const saved = savedHashes()[person.id];
  if (saved) return same(hash(password, saved.split(":")[0]), saved);
  // Until they set one, the password is their mobile number, typed with or without +91.
  const typed = mobileOf(password);
  return typed.length === 10 && same(typed, mobileOf(person.mobile));
}

export async function setPassword(userId: string, password: string) {
  const hashed = hash(password);
  await saving(() =>
    writeRecord(FILE, {
      about: "Passwords people set for themselves, as salted hashes (never the passwords). Delete a line to put that person back on their mobile number.",
      passwords: { ...savedHashes(), [userId]: hashed },
    }),
  );
}
