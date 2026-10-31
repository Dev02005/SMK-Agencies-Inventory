"use server";

import { cookies } from "next/headers";
import { PERSONAL_COOKIE, pinMatches, unlockCookie } from "@/lib/personal-lock";

/** Checks the PIN on the server; setting the cookie makes Next.js re-render the Personal page with the records. */
export async function unlockPersonal(pin: string): Promise<{ ok: boolean }> {
  if (typeof pin !== "string" || !/^\d{4}$/.test(pin) || !pinMatches(pin)) {
    // A short wait on every wrong PIN makes guessing all 10,000 slow.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { ok: false };
  }
  const { name, value, options } = unlockCookie();
  (await cookies()).set(name, value, options);
  return { ok: true };
}

export async function lockPersonal() {
  (await cookies()).delete({ name: PERSONAL_COOKIE, path: "/personal" });
}
