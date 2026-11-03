import { createHmac, timingSafeEqual } from "node:crypto";
import { allRoles } from "./labels";
import type { Role } from "./data/types";
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

/** `role` lets proxy.ts keep each role to its own pages. */
export function newSession(userId: string, role: Role, now = Date.now()) {
  const until = nextMidnightIST(now);
  const payload = `${userId}.${role}.${now}.${until}`;
  return { value: `${payload}.${sign(payload)}`, expires: new Date(until) };
}

/**
 * The signed-in user and their role, when they signed in and when the session ends; null if there is no session, it
 * was tampered with, or midnight has passed.
 */
export function readSession(token: string | undefined, now = Date.now()) {
  const [userId, role, since, until, mac, extra] = token?.split(".") ?? [];
  if (!userId || !role || !since || !until || !mac || extra !== undefined || !same(mac, sign(`${userId}.${role}.${since}.${until}`))) return null;
  if (!allRoles.includes(role as Role)) return null;
  return Number(until) > now ? { userId, role: role as Role, since: Number(since), until: Number(until) } : null;
}
