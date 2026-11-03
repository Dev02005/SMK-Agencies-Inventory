import { createHmac } from "node:crypto";

/**
 * A signing key for one purpose (sign-ins, the Personal lock), worked out from SKA_DATA_SECRET, the one key the
 * server has, so nothing else needs setting on Vercel. Undefined while the records are on this computer.
 */
export function keyFor(purpose: "session" | "personal"): string | undefined {
  const data = process.env.SKA_DATA_SECRET?.trim();
  return data ? createHmac("sha256", data).update(`ska-${purpose}`).digest("hex") : undefined;
}
