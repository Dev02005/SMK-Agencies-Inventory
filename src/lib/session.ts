import { createHmac, timingSafeEqual } from "node:crypto";
import { nextMidnightIST } from "./midnight";

/**
 * Sign-in session: a signed, httpOnly cookie that expires at the next midnight in India time, so everyone is
 * signed out at 12 AM every night. proxy.ts checks it before any page renders and the app layout checks it again.
 * With Supabase, the user comes from Supabase Auth and the same midnight rule is kept on top.
 */
export const SESSION_COOKIE = "ska-session";

/** Set SESSION_SECRET (any long random string) on the live server; the fallback is only for sample mode. */
const secret = () => process.env.SESSION_SECRET || "ska-sample-mode-session-key";
const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("hex");

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Sample-mode login (the owner) until Supabase Auth is connected; set SKA_LOGIN_ID and SKA_LOGIN_PASSWORD to change it. */
const loginId = () => process.env.SKA_LOGIN_ID || "123456789";
const loginPassword = () => process.env.SKA_LOGIN_PASSWORD || "123456789";

export function loginMatches(id: string, password: string) {
  return same(id, loginId()) && same(password, loginPassword());
}

/** The login ID shown on the Account page. */
export function loginIdOf(userId: string) {
  return userId === "u-owner" ? loginId() : userId;
}

export function newSession(userId: string, now = Date.now()) {
  const until = nextMidnightIST(now);
  const payload = `${userId}.${now}.${until}`;
  return { value: `${payload}.${sign(payload)}`, expires: new Date(until) };
}

/** The signed-in user with when they signed in and when the session ends, or null if there is none, it was tampered with, or midnight has passed. */
export function readSession(token: string | undefined, now = Date.now()) {
  const [userId, since, until, mac, extra] = token?.split(".") ?? [];
  if (!userId || !since || !until || !mac || extra !== undefined || !same(mac, sign(`${userId}.${since}.${until}`))) return null;
  return Number(until) > now ? { userId, since: Number(since), until: Number(until) } : null;
}
