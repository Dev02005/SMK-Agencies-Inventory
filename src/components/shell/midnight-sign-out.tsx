"use client";

import { useEffect } from "react";
import type { Role } from "@/lib/data/types";
import { forgetSignedIn, rememberSignedIn, signedInNow } from "@/lib/roles";

/**
 * Signs an open app out at 12 AM India time (`until`, from the session). A timer covers an app left open;
 * the checks on focus and on coming back to the tab cover a phone or laptop that slept through midnight.
 */
export function MidnightSignOut({ until }: { until: number }) {
  useEffect(() => {
    const leave = () => {
      forgetSignedIn();
      window.location.replace("/login?reason=midnight");
    };
    const check = () => {
      if (Date.now() >= until) leave();
    };
    // Timers can't wait more than about 24.8 days; a session never lasts more than one day.
    const timer = window.setTimeout(leave, Math.max(0, until - Date.now()));
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", check);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
      window.removeEventListener("pageshow", check);
    };
  }, [until]);
  return null;
}

/**
 * Keeps this device's idea of who is signed in (and so which screens show) in step with the server's session.
 * Checked when a page loads, not on every change, so signing out isn't undone on the way to the sign-in page.
 */
export function SignedInSync({ id, role }: { id: string; role: Role }) {
  useEffect(() => {
    const stored = signedInNow();
    if (stored?.id !== id || stored?.role !== role) rememberSignedIn({ id, role });
  }, [id, role]);
  return null;
}
