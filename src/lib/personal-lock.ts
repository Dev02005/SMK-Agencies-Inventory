import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { readRecord, saving, syncRecords, writeRecord } from "@/lib/data/store";
import { keyFor } from "@/lib/keys";
import { hashMatches, hashSecret } from "@/lib/passwords";

/**
 * The Personal PIN is checked here on the server, never in the browser. The owner chooses it the first time they
 * open Personal; it is kept as a salted hash (never the PIN) in the personal-pin.json record, so online it lives in
 * Supabase. A correct PIN sets a signed, httpOnly cookie for 30 minutes (or until the browser closes); every Personal
 * page checks it before reading any record. Deleting the record lets the owner choose a new PIN.
 */
export const PERSONAL_COOKIE = "ska-personal";
const UNLOCK_MINUTES = 30;
const PIN_RECORD = "personal-pin.json";

let generatedSecret: string | undefined;
/** Online the key comes from SKA_DATA_SECRET (keys.ts); on a computer each start makes its own, which locks Personal again. */
const secret = () => keyFor("personal") ?? (generatedSecret ??= randomBytes(32).toString("hex"));

const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("hex");

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function savedPin(): string | undefined {
  const saved = (readRecord(PIN_RECORD) as { pin?: unknown } | undefined)?.pin;
  return typeof saved === "string" && saved.includes(":") ? saved : undefined;
}

/** Whether the owner has chosen a PIN yet. */
export async function pinIsSet() {
  await syncRecords();
  return savedPin() !== undefined;
}

export async function pinMatches(pin: string) {
  await syncRecords();
  const saved = savedPin();
  return saved !== undefined && hashMatches(pin, saved);
}

/** Saves a PIN: the first one only while none is set, a new one only when `current` is the PIN saved now. */
export function savePin(pin: string, current?: string): Promise<boolean> {
  const hashed = hashSecret(pin);
  return saving(() => {
    const saved = savedPin();
    const allowed = current === undefined ? saved === undefined : saved !== undefined && hashMatches(current, saved);
    if (!allowed) return false;
    writeRecord(PIN_RECORD, { about: "The owner's Personal PIN, as a salted hash (never the PIN). Delete this record to choose a new PIN.", pin: hashed });
    return true;
  });
}

export function unlockCookie() {
  const until = String(Date.now() + UNLOCK_MINUTES * 60_000);
  return {
    name: PERSONAL_COOKIE,
    value: `${until}.${sign(until)}`,
    options: { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/personal" } as const,
  };
}

export async function isPersonalUnlocked() {
  const token = (await cookies()).get(PERSONAL_COOKIE)?.value;
  if (!token) return false;
  // The expiry check reads the clock, which must happen per request, never while prerendering.
  await connection();
  const [until, mac] = token.split(".");
  return Boolean(until && mac) && same(mac, sign(until)) && Number(until) > Date.now();
}
