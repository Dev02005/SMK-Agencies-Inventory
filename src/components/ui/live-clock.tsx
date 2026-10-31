"use client";

import { useEffect, useState } from "react";

const clock = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

/** The current time, ticking. Starts from the server's `now` so the first paint matches what was sent. */
function useNow(now: number) {
  const [at, setAt] = useState(now);
  useEffect(() => {
    const id = window.setInterval(() => setAt(Date.now()), 10_000);
    return () => window.clearInterval(id);
  }, []);
  return at;
}

/** "10:42 am" in India time, kept current. */
export function LiveTime({ now }: { now: number }) {
  const at = useNow(now);
  return <time dateTime={new Date(at).toISOString()}>{clock.format(at)}</time>;
}

/** "13 h 20 min" until `until`, kept current. */
export function TimeLeft({ now, until }: { now: number; until: number }) {
  const minutes = Math.max(0, Math.ceil((until - useNow(now)) / 60_000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return <>{h ? `${h} h ${m} min` : `${m} min`}</>;
}
