/**
 * Business limits used on several screens, kept in one place.
 * They become owner settings once the database is connected.
 */

/** Below this a godown item shows "Low" and raises a notification. */
export const LOW_STOCK = { bag: 150, kg: 2000 } as const;

export function isLowStock(qty: number, unit: keyof typeof LOW_STOCK) {
  return qty < LOW_STOCK[unit];
}

/** Cash a field staff member should not carry overnight. */
export const CASH_LIMIT = 50000;
