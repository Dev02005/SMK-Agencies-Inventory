/** Rules for a new password, shared by the forms (instant feedback) and the server (the real check). */
export const MIN_PASSWORD = 8;

export function passwordProblem(password: string, mobile?: string): string | undefined {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  const digits = password.replace(/[\s+-]/g, "");
  if (mobile && [mobile, `0${mobile}`, `91${mobile}`].includes(digits)) return "Don't use your mobile number; anyone who has it could sign in.";
  return undefined;
}
