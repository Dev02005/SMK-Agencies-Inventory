import "server-only";
import { getDesignations, getProfiles } from "@/lib/data";
import type { Profile } from "@/lib/data/types";
import { checkPassword } from "@/lib/passwords";
import { loginMatches, ownerLoginId } from "@/lib/session";

/** "+91 98765 43210", "09876543210" and "9876543210" are the same mobile number. */
function mobileOf(text: string) {
  const digits = text.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

/** The person a login ID belongs to: the sample owner login (123456789), a mobile number or an email. */
async function personFor(loginId: string): Promise<Profile | undefined> {
  const id = loginId.trim();
  const profiles = (await getProfiles()).filter((p) => p.active);
  if (id && id === ownerLoginId()) return profiles.find((p) => p.role === "owner");
  const email = id.includes("@") ? id.toLowerCase() : undefined;
  const mobile = email ? undefined : mobileOf(id);
  return profiles.find((p) => (email ? p.email?.toLowerCase() === email : mobile && mobile.length === 10 && p.mobile === mobile));
}

/** Sign-in step 1: whose number this is, so the screen can greet them by name before asking for the password. */
export async function findPerson(loginId: string): Promise<{ name: string; initials: string; designation: string } | null> {
  const person = await personFor(loginId);
  if (!person) return null;
  return { name: person.fullName, initials: person.initials, designation: (await getDesignations())[person.id] ?? "" };
}

/**
 * Sign-in step 2: who is signing in, or null. Anyone on the staff list signs in with their mobile number or email.
 * Their starting password is their mobile number, which they must replace on that first sign-in (`mustChange`);
 * after that only their own password works. The sample owner login (123456789) keeps working as before.
 */
export async function findLogin(loginId: string, password: string): Promise<{ id: string; role: string; mustChange: boolean } | null> {
  const id = loginId.trim();
  if (loginMatches(id, password)) {
    const owner = (await getProfiles()).find((p) => p.active && p.role === "owner");
    return owner ? { id: owner.id, role: owner.role, mustChange: false } : null;
  }
  const person = await personFor(id);
  if (!person || id === ownerLoginId()) return null;
  const check = checkPassword(person, password);
  return check.ok ? { id: person.id, role: person.role, mustChange: check.starting } : null;
}
