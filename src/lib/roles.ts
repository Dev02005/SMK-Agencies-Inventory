"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Role } from "@/lib/data/types";
import { allRoles } from "@/lib/labels";

export { allRoles, roleLabels } from "@/lib/labels";

/**
 * Who is signed in on this device, and the role whose screens are shown: always their own role.
 * Written at sign-in and checked against the server's session on every page (SignedInSync).
 */
// Left over from the old "View as" switcher; cleared at sign-in and sign-out so no old choice lingers.
const VIEW_AS = "ska-view-as";
const SIGNED_IN = "ska-signed-in";
const listeners = new Set<() => void>();

export type SignedIn = { id: string; role: Role };

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function read(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked (private mode): the choice simply won't persist.
  }
}

const notify = () => listeners.forEach((listener) => listener());

/** Called at sign-in (and when the server's session names someone else): their own screens, from the start. */
export function rememberSignedIn(user: SignedIn) {
  write(SIGNED_IN, JSON.stringify(user));
  write(VIEW_AS, null);
  notify();
}

/** Called just before signing out. */
export function forgetSignedIn() {
  write(SIGNED_IN, null);
  write(VIEW_AS, null);
  notify();
}

function parse(raw: string | null): SignedIn | null {
  try {
    const value = raw ? (JSON.parse(raw) as SignedIn) : null;
    return value && allRoles.includes(value.role) ? value : null;
  } catch {
    return null;
  }
}

/** Who this device thinks is signed in, read once (for effects). */
export function signedInNow() {
  return parse(read(SIGNED_IN));
}

export function useSignedIn(): SignedIn | null {
  const raw = useSyncExternalStore(subscribe, () => read(SIGNED_IN), () => null);
  return useMemo(() => parse(raw), [raw]);
}

/** The role whose screens are shown: the signed-in person's own (the owner's until the device knows who it is). */
export function useViewAs(): [Role] {
  const signedIn = useSignedIn();
  return [signedIn?.role ?? "owner"];
}
