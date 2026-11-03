"use server";

import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/data";
import { PERSONAL_COOKIE, pinMatches, savePin, unlockCookie } from "@/lib/personal-lock";

const isPin = (pin: unknown): pin is string => typeof pin === "string" && /^\d{4}$/.test(pin);

/** Sets the unlock cookie, which makes Next.js re-render the Personal page with the records. */
async function unlock() {
  const { name, value, options } = unlockCookie();
  (await cookies()).set(name, value, options);
}

/** Checks the PIN on the server. */
export async function unlockPersonal(pin: string): Promise<{ ok: boolean }> {
  if ((await getCurrentUser()).role !== "owner" || !isPin(pin) || !(await pinMatches(pin))) {
    // A short wait on every wrong PIN makes guessing all 10,000 slow.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { ok: false };
  }
  await unlock();
  return { ok: true };
}

/** The first time: the owner chooses the PIN (only while none is set), and Personal opens. */
export async function choosePersonalPin(pin: string): Promise<{ ok: boolean }> {
  if ((await getCurrentUser()).role !== "owner" || !isPin(pin) || !(await savePin(pin))) return { ok: false };
  await unlock();
  return { ok: true };
}

export async function lockPersonal() {
  (await cookies()).delete({ name: PERSONAL_COOKIE, path: "/personal" });
}
