/** "+91 98765 43210", "+919876543210", "09876543210" and "9876543210" are the same mobile number: these 10 digits. */
export function mobileOf(text: string) {
  const digits = text.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}
