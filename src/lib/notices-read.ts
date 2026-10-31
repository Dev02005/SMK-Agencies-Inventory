"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Which notifications this browser has opened. Kept on the device for the sample stage;
 * with the database connected it becomes a read_at column on each person's notifications.
 */
const KEY = "ska-notices-read";
const listeners = new Set<() => void>();
const empty: ReadonlySet<string> = new Set();
let cachedRaw: string | null = null;
let cached: ReadonlySet<string> = empty;

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function readIds(): ReadonlySet<string> {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return empty;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cached = new Set(JSON.parse(raw ?? "[]") as string[]);
    } catch {
      cached = empty;
    }
  }
  return cached;
}

export function useReadNotices(): [ReadonlySet<string>, (ids: string[]) => void] {
  const read = useSyncExternalStore(subscribe, readIds, () => empty);
  const markRead = useCallback((ids: string[]) => {
    const next = new Set([...readIds(), ...ids]);
    try {
      // Keep the list short: old ids drop off once there are more than 300.
      window.localStorage.setItem(KEY, JSON.stringify([...next].slice(-300)));
    } catch {
      // Storage blocked: the dot simply comes back on reload.
    }
    listeners.forEach((listener) => listener());
  }, []);
  return [read, markRead];
}
