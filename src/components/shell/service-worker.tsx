"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js in production builds only; in development it would hold on to files that change with
 * every edit. updateViaCache "none" makes each visit check for a new version of the worker.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Not supported here (private window, old browser): the app still works, just without offline start.
    });
  }, []);
  return null;
}
