import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { readSession, SESSION_COOKIE } from "./session";

/** The current session, or a trip to the sign-in page. proxy.ts already checks this; it is checked again here. */
export async function requireSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  // The check compares the session's end with the clock, so it waits for the actual request (never a prefetch).
  await connection();
  const session = readSession(token);
  if (!session) redirect("/login");
  return session;
}
