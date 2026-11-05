import "server-only";
import { getSignInPeople } from "@/lib/data";
import { mobileOf } from "@/lib/mobile";
import { isCode } from "@/lib/password-rules";
import { checkPassword } from "@/lib/passwords";

/** The person a login ID belongs to: their mobile number (with or without +91) or their email. */
async function personFor(loginId: string) {
  const id = loginId.trim();
  const email = id.includes("@") ? id.toLowerCase() : undefined;
  const mobile = email ? undefined : mobileOf(id);
  return (await getSignInPeople()).find((p) => (email ? p.email?.toLowerCase() === email : mobile && mobile.length === 10 && mobileOf(p.mobile) === mobile));
}

/** Sign-in step 1: whose number this is, so the screen can greet them by name before asking for their code. */
export async function findPerson(loginId: string): Promise<{ name: string; initials: string; designation: string } | null> {
  const person = await personFor(loginId);
  if (!person) return null;
  return { name: person.fullName, initials: person.initials, designation: person.designation };
}

/**
 * Sign-in step 2: who is signing in, or null. Everyone, the owner too, signs in with their mobile number or email and
 * a 6-digit code: 000000 to start with; once they set their own (Settings › Account) only that works.
 */
export async function findLogin(loginId: string, password: string): Promise<{ id: string; role: string } | null> {
  if (!isCode(password)) return null;
  const person = await personFor(loginId);
  return person && checkPassword(person, password) ? { id: person.id, role: person.role } : null;
}
