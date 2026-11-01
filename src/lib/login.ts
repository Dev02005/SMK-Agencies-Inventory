import "server-only";
import { getProfiles } from "@/lib/data";
import { checkPassword } from "@/lib/passwords";
import { loginMatches } from "@/lib/session";

/** "+91 99492 45484", "09949245484" and "9949245484" are the same mobile number. */
function mobileOf(text: string) {
  const digits = text.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

/**
 * Who is signing in, or null. Anyone on the staff list signs in with their mobile number or email. Their starting
 * password is their mobile number, which they must replace on that first sign-in (`mustChange`); after that only
 * their own password works. The sample owner login (123456789) keeps working as before.
 */
export async function findLogin(loginId: string, password: string): Promise<{ id: string; role: string; mustChange: boolean } | null> {
  const id = loginId.trim();
  const profiles = (await getProfiles()).filter((p) => p.active);
  if (loginMatches(id, password)) {
    const owner = profiles.find((p) => p.role === "owner");
    return owner ? { id: owner.id, role: owner.role, mustChange: false } : null;
  }
  const email = id.includes("@") ? id.toLowerCase() : undefined;
  const mobile = email ? undefined : mobileOf(id);
  const person = profiles.find((p) => (email ? p.email?.toLowerCase() === email : mobile && mobile.length === 10 && p.mobile === mobile));
  if (!person) return null;
  const check = checkPassword(person, password);
  return check.ok ? { id: person.id, role: person.role, mustChange: check.starting } : null;
}
