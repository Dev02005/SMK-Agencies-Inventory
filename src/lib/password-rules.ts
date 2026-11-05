/** Rules for the 6-digit sign-in code, shared by the forms (instant feedback) and the server (the real check). */
export const CODE_LENGTH = 6;
/** Everyone's code until they set their own in Settings › Account. */
export const DEFAULT_CODE = "000000";

export const isCode = (code: unknown): code is string => typeof code === "string" && /^\d{6}$/.test(code);

/** Why a new code can't be used, or undefined if it can. */
export function codeProblem(code: string): string | undefined {
  if (!isCode(code)) return `Use exactly ${CODE_LENGTH} digits.`;
  if (code === DEFAULT_CODE) return "Choose a code other than 000000; everyone starts with that one.";
  return undefined;
}
