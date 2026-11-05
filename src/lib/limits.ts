/**
 * Business limits used on several screens, kept in one place.
 * They become owner settings once the database is connected.
 */

/** Below this a godown item shows "Low" and raises a notification. */
const LOW_STOCK: Record<string, number> = { bag: 150, kg: 2000 };

export function isLowStock(qty: number, unit: string) {
  const threshold = LOW_STOCK[unit] ?? 10;
  return qty < threshold;
}

/** Cash a field staff member should not carry overnight. */
export const CASH_LIMIT = 50000;

