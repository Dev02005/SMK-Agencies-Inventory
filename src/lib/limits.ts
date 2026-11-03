/**
 * Business limits used on several screens, kept in one place.
 * They become owner settings once the database is connected.
 */

/** Below this a godown item shows "Low" and raises a notification. */
const LOW_STOCK = { bag: 150, kg: 2000 } as const;

export function isLowStock(qty: number, unit: keyof typeof LOW_STOCK) {
  return qty < LOW_STOCK[unit];
}

/** Cash a field staff member should not carry overnight. */
export const CASH_LIMIT = 50000;

/** Work starts at this time (24-hour, India time); checking in more than LATE_AFTER_MINUTES after it counts as late. */
export const WORK_STARTS_AT = "09:00";
export const LATE_AFTER_MINUTES = 15;
