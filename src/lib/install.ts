"use client";

import { useSyncExternalStore } from "react";

/**
 * "Install the app" on every platform:
 * - Chrome, Edge and Samsung Internet (Android, Windows, Mac, ChromeOS) hand us a prompt for our own button.
 * - iPhone and iPad have none, so we explain Share → Add to Home Screen.
 * - Safari on a Mac (version 17 and later) installs from File → Add to Dock.
 * - Firefox on Android installs from its own menu.
 */
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
export type InstallState =
  | { kind: "prompt" }
  | { kind: "ios"; device: "iPhone" | "iPad" }
  | { kind: "mac-safari" }
  | { kind: "android-menu" }
  | { kind: "installed" }
  | { kind: "none" };

let deferred: InstallPromptEvent | null = null;
let installed = false;
let started = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

const none: InstallState = { kind: "none" };
// Fixed objects, so the snapshot only changes when the state really does.
const states = {
  prompt: { kind: "prompt" },
  iPhone: { kind: "ios", device: "iPhone" },
  iPad: { kind: "ios", device: "iPad" },
  macSafari: { kind: "mac-safari" },
  androidMenu: { kind: "android-menu" },
  installed: { kind: "installed" },
} as const;

function start() {
  if (started) return;
  started = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    notify();
  });
}

// Listen as soon as this module loads: the browser can offer the prompt before React has finished starting.
if (typeof window !== "undefined") start();

function subscribe(callback: () => void) {
  start();
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function platformState(): InstallState {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac, but with a touch screen.
  const iPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (iPad) return states.iPad;
  if (/iPhone|iPod/.test(ua)) return states.iPhone;
  const safariVersion = Number(/Version\/(\d+)/.exec(ua)?.[1] ?? 0);
  if (/Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/.test(ua) && safariVersion >= 17) return states.macSafari;
  if (/Android/.test(ua) && /Firefox/.test(ua)) return states.androidMenu;
  return none;
}

function snapshot(): InstallState {
  if (installed || isStandalone()) return states.installed;
  if (deferred) return states.prompt;
  return platformState();
}

export function useInstall() {
  return useSyncExternalStore(subscribe, snapshot, () => none);
}

/** Shows the browser's own install dialog; returns true if the person installed. */
export async function promptInstall() {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === "accepted") installed = true;
  notify();
  return outcome === "accepted";
}

const DISMISS_KEY = "ska-install-dismissed";
const DISMISS_DAYS = 30;

export function wasDismissedRecently() {
  try {
    const at = Number(window.localStorage.getItem(DISMISS_KEY));
    return Boolean(at) && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

export function rememberDismissed() {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Storage blocked: the card may show again next visit.
  }
}
