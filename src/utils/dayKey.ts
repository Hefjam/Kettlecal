/**
 * The single date-bucketing function for the coach. Returns a LOCAL calendar
 * day as YYYY-MM-DD (not UTC) so "a new day" turns over at the user's midnight,
 * not London's. useTodayPlan freshness and any recency comparison route through
 * this — never `toISOString().slice(0,10)`, which would roll over mid-evening
 * for anyone west of UTC.
 */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
