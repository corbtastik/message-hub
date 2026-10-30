/* Date formatting for templates.
 *
 * Dates come from front matter as plain YYYY-MM-DD, so everything formats in
 * UTC. Formatting locally would let a timezone west of GMT pull a post back
 * onto the previous day -- which changes the visible date, the activity graph
 * and the filename the post is found by. */
const fmt = (date, opts) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts }).format(date);

export const weekday = (d) => fmt(d, { weekday: "long" });
export const longDate = (d) =>
  fmt(d, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
export const shortDate = (d) =>
  fmt(d, { month: "numeric", day: "numeric", year: "2-digit" });
export const isoDate = (d) => d.toISOString().slice(0, 10);
