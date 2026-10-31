const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrPaise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Indian grouping with the rupee sign: 302000 → "₹3,02,000"; with paise always two digits: 23.6 → "₹23.60". */
export function formatINR(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return (Number.isInteger(rounded) ? inr : inrPaise).format(rounded);
}

/** Ledger balance with Dr/Cr: positive = the party owes us (Dr), negative = we owe them (Cr). */
export function formatBalance(balance: number): string {
  if (Math.abs(balance) < 0.005) return formatINR(0);
  return `${formatINR(Math.abs(balance))} ${balance > 0 ? "Dr" : "Cr"}`;
}

export function formatNumber(value: number, maxDigits = 2): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: maxDigits }).format(value);
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-25" → "25 Oct 2026". Parsed as a plain date so the time zone never shifts the day. */
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${d} ${months[m - 1]} ${y}`;
}

/** "2026-10-25" → "25 Oct" for lists. */
export function formatShortDate(isoDate: string): string {
  const [, m, d] = isoDate.split("-").map(Number);
  return `${d} ${months[m - 1]}`;
}

/** "2026-10" moved by whole months: ("2026-10", -1) → "2026-09", ("2026-12", 1) → "2027-01". */
export function shiftMonth(isoMonth: string, by: number): string {
  const [y, m] = isoMonth.split("-").map(Number);
  const total = y * 12 + (m - 1) + by;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** "2026-10" → "Oct 2026". */
export function formatMonth(isoMonth: string): string {
  const [y, m] = isoMonth.split("-").map(Number);
  return `${months[m - 1]} ${y}`;
}

/** Today's date as "YYYY-MM-DD" in Indian time, for date inputs. */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

const ones = [
  "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function belowHundred(n: number): string {
  return n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`;
}

function belowThousand(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${ones[h]} hundred` : "", rest ? belowHundred(rest) : ""].filter(Boolean).join(" ");
}

/** Amount in words with Indian units, for printed bills: 302000 → "Rupees three lakh two thousand only". */
export function rupeesInWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  if (rupees === 0 && paise === 0) return "Rupees zero only";
  const crore = Math.floor(rupees / 10_000_000);
  const lakh = Math.floor((rupees % 10_000_000) / 100_000);
  const thousand = Math.floor((rupees % 100_000) / 1000);
  const rest = rupees % 1000;
  const parts = [
    crore ? `${belowThousand(crore)} crore` : "",
    lakh ? `${belowHundred(lakh)} lakh` : "",
    thousand ? `${belowHundred(thousand)} thousand` : "",
    rest ? belowThousand(rest) : "",
  ].filter(Boolean);
  const words = `Rupees ${parts.join(" ")}`;
  return paise ? `${words} and ${belowHundred(paise)} paise only` : `${words} only`;
}
