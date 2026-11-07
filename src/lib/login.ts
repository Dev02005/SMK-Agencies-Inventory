import "server-only";
import { getSignInPeople } from "@/lib/data";
import { mobileOf } from "@/lib/mobile";
import { isCode } from "@/lib/password-rules";
import { checkPassword } from "@/lib/passwords";

/** The person a login ID belongs to: their mobile number (with or without +91) or their email. */
async function personFor(loginId: string) {
  const id = loginId.trim();
  if (!id) return null;
  const lower = id.toLowerCase();
  const email = id.includes("@") ? lower : undefined;
  const mobile = email ? undefined : mobileOf(id);
  const people = await getSignInPeople();
  return (
    people.find((p) => {
      if (email) return p.email?.toLowerCase() === email;
      if (mobile && mobile.length === 10) {
        if (mobileOf(p.mobile) === mobile) return true;
        // Kamesh Potnuru matches primary 9441117278 and secondary 9963684551
        if ((p.id === "u-kamesh" || p.role === "owner") && (mobile === "9963684551" || mobile === "9441117278")) return true;
      }
      // Flexible matching for names and usernames
      const pName = p.fullName.toLowerCase();
      if (pName === lower || p.id.toLowerCase() === lower) return true;
      if (pName.split(/\s+/).includes(lower)) return true;
      if (lower.length >= 3 && pName.includes(lower)) return true;
      if ((lower === "owner" || lower === "admin") && p.role === "owner") return true;
      return false;
    }) ?? null
  );
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
