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
  const fmtLong = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC", month: "long", year: "numeric",
  });
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
    // Per-month totals, so a component can show volume rather than only
    // presence. firstIso is where a click on the month should land.
    const withPosts = days.filter((d) => d.count);
    months.push({
      name: fmtMonth.format(new Date(Date.UTC(y, mo - 1, 1))),
      year: y,
      monthNo: mo,
      days,
      count: withPosts.reduce((n, d) => n + d.count, 0),
      firstIso: withPosts.length ? withPosts[0].iso : "",
      label: `${fmtLong.format(new Date(Date.UTC(y, mo - 1, 1)))} — ${
        withPosts.reduce((n, d) => n + d.count, 0)
      } post${withPosts.reduce((n, d) => n + d.count, 0) === 1 ? "" : "s"}`,
    });
  }

  /* Newest-first, running from THIS month back to the first post -- anchored
   * to the calendar rather than to the last post, so a quiet stretch shows as
   * empty rows at the top instead of the chart ending early. A row per month
   * means the column count never grows, so the only thing a long archive adds
   * is scroll. */
  const now = new Date();
  const recent = [];
  let ry = now.getUTCFullYear();
  let rm = now.getUTCMonth() + 1;
  // Guard against an archive whose newest post is somehow ahead of today.
  if (ry < ly || (ry === ly && rm < lm)) { ry = ly; rm = lm; }
  let prevYear = null;
  while (ry > fy || (ry === fy && rm >= fm)) {
    const found = months.find((m) => m.year === ry && m.monthNo === rm);
    const at = new Date(Date.UTC(ry, rm - 1, 1));
    recent.push({
      name: fmtMonth.format(at),
      year: ry,
      monthNo: rm,
      count: found ? found.count : 0,
      firstIso: found ? found.firstIso : "",
      label: found
        ? found.label
        : `${fmtLong.format(at)} — no posts`,
      // The year is printed only when it changes going down the list.
      showYear: ry !== prevYear,
    });
    prevYear = ry;
    rm === 1 ? ((rm = 12), ry--) : rm--;
  }

  return {
    months,
    recent,
    busiest: months.reduce((m, x) => Math.max(m, x.count), 0),
    total: [...counts.values()].reduce((a, b) => a + b, 0),
    days: counts.size,
    maxDays: Math.max(...months.map((m) => m.days.length)),
  };
}
