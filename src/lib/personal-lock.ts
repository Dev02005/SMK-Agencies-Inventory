import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * The Personal PIN is checked here on the server, never in the browser. A correct PIN sets a signed, httpOnly
 * cookie for 30 minutes (or until the browser closes); every Personal page checks it before reading any record.
 * With login, unlocking will also require the signed-in user to be the owner, and the PIN moves to a hashed
 * value on the owner's profile.
 */
export const PERSONAL_COOKIE = "ska-personal";
const UNLOCK_MINUTES = 30;

/** Only used on sample data; with real data set PERSONAL_PIN (and PERSONAL_LOCK_SECRET) in the environment. */
export const SAMPLE_PIN = "1234";

let generatedSecret: string | undefined;
/** Without PERSONAL_LOCK_SECRET each server start makes its own, which simply locks Personal again after a restart. */
function secret() {
  return process.env.PERSONAL_LOCK_SECRET || (generatedSecret ??= randomBytes(32).toString("hex"));
}

const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("hex");

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function pinMatches(pin: string) {
  const expected = process.env.PERSONAL_PIN || (isSupabaseConfigured ? "" : SAMPLE_PIN);
  return expected.length > 0 && same(pin, expected);
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
