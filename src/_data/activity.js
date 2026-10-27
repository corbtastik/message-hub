/* The calendar behind the activity graph on the home page.
 *
 * One row per month, one column per day of the month. GitHub's layout -- a
 * column per week across a year -- assumes a wide page; inside this site's
 * 440px column it needed horizontal scrolling and dots too small to tap.
 * Months-as-rows is at most 31 columns, so it fits the column at any width
 * and the dots come out larger.
 *
 * Reads the post filenames rather than their contents: the date prefix is
 * all this needs, so it stays cheap as the archive grows. */

import fs from "node:fs";

const POSTS = "src/posts";

export default function () {
  const counts = new Map();
  for (const f of fs.readdirSync(POSTS)) {
    const m = f.match(/^(\d{4}-\d{2}-\d{2})-.*\.md$/);
    if (m) counts.set(m[1], (counts.get(m[1]) || 0) + 1);
  }
  if (!counts.size) return { months: [], total: 0, days: 0, maxDays: 31 };

  const keys = [...counts.keys()].sort();
  const [fy, fm] = keys[0].split("-").map(Number);
  const [ly, lm] = keys[keys.length - 1].split("-").map(Number);

  const fmtMonth = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short" });
  const fmtFull = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const months = [];
  for (let y = fy, mo = fm; y < ly || (y === ly && mo <= lm); mo === 12 ? (mo = 1, y++) : mo++) {
    const inMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    const days = [];
    for (let d = 1; d <= inMonth; d++) {
      const date = new Date(Date.UTC(y, mo - 1, d));
      const iso = date.toISOString().slice(0, 10);
      const count = counts.get(iso) || 0;
      days.push({
        iso,
        day: d,
        count,
        // 0 none, 1 one post, 2 more than one.
        level: count === 0 ? 0 : count === 1 ? 1 : 2,
        label: count
          ? `${fmtFull.format(date)} — ${count} post${count > 1 ? "s" : ""}`
          : `${fmtFull.format(date)} — none`,
      });
    }
    months.push({
      name: fmtMonth.format(new Date(Date.UTC(y, mo - 1, 1))),
      year: y,
      days,
    });
  }

  return {
    months,
    total: [...counts.values()].reduce((a, b) => a + b, 0),
    days: counts.size,
    maxDays: Math.max(...months.map((m) => m.days.length)),
  };
}
