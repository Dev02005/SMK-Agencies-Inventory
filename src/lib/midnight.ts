/** India has one time zone and no daylight saving: UTC + 5:30. */
const IST_OFFSET_MS = 330 * 60_000;

/** The next 12:00 AM in India time, as a timestamp. Sign-ins end then, so everyone signs in afresh each day. */
export function nextMidnightIST(now = Date.now()) {
  const ist = new Date(now + IST_OFFSET_MS);
  return Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + 1) - IST_OFFSET_MS;
}
