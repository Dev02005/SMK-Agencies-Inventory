import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Profile } from "@/lib/data/types";
import { readRecord, saving, writeRecord } from "@/lib/data/store";
import { DEFAULT_CODE } from "@/lib/password-rules";

/**
 * 6-digit sign-in codes people set for themselves (Settings › Account). Everyone starts with 000000. The ones they set
 * are kept as salted scrypt hashes, never the codes, in the login-codes.json record (store.ts: local-data/ on a
 * computer, Supabase online); deleting someone's line there puts them back on 000000. (The older passwords.json
 * record, from when these were free-text passwords, is no longer read.)
 */
const FILE = "login-codes.json";

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

/** Whether `code` is this person's sign-in code: the one they set, or else 000000. */
export function checkPassword(person: Pick<Profile, "id">, code: string): boolean {
  const saved = savedHashes()[person.id];
  if (saved) return hashMatches(code, saved);
  return code === DEFAULT_CODE;
}

export async function setPassword(userId: string, password: string) {
  const hashed = hashSecret(password);
  await saving(() =>
    writeRecord(FILE, {
      about: "6-digit sign-in codes people set for themselves, as salted hashes (never the codes). Delete a line to put that person back on 000000.",
      passwords: { ...savedHashes(), [userId]: hashed },
    }),
  );
}
