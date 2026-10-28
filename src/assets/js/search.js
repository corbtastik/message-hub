/* Client-side filtering for the post list.
 *
 * Dates are typed straight into the search box rather than picked from a
 * widget: "5/21/26" filters to that day, "5/1/26 to 5/15/26" to that range
 * (also "-", "–" or ".." as the separator, or just two dates side by side).
 * Whatever is left over after the dates are pulled out is the text query, so
 * "list 9/1/26 to 9/15/26" works.
 *
 * Every row carries its own lowercased searchable text in data-text and its
 * date in data-date (YYYY-MM-DD, which compares correctly as a string). The
 * whole list is already in the DOM, so this only shows, hides and reorders
 * rows -- the page works without it, just unfiltered. */
(function () {
  "use strict";

  var list = document.getElementById("post-list");
  var tools = document.getElementById("tools");
  if (!list || !tools) return;

  var q = document.getElementById("q");
  var sortBtn = document.getElementById("sort");
  var sortLabel = document.getElementById("sort-label");
  var count = document.getElementById("result-count");
  var noMatch = document.getElementById("no-match");

  var rows = Array.prototype.slice.call(list.querySelectorAll(".row"));
  if (!rows.length) return;

  rows.forEach(function (row) {
    row._text = row.getAttribute("data-text") || "";
    row._date = row.getAttribute("data-date") || "";
  });

  var total = rows.length;
  var newestFirst = true;

  /* Which slice of the archive this page holds. Filtering and sorting only
     ever see these rows -- the rest of the archive is on other pages and not
     in this document. */
  var thisPage = Number(list.getAttribute("data-page")) || 1;
  var pages = Number(list.getAttribute("data-pages")) || 1;
  var pageHref = function (n) { return n <= 1 ? "/" : "/page/" + n + "/"; };

  /* ---------- date parsing ---------- */

  var D = "(\\d{1,2})/(\\d{1,2})/(\\d{2,4})";
  var RANGE = new RegExp(D + "\\s*(?:to|through|thru|until|\\.\\.|-|–|—)\\s*" + D, "i");
  var ONE = new RegExp(D, "g");

  // Returns YYYY-MM-DD, or "" if the pieces are not a real calendar date.
  function iso(m, d, y) {
    var mm = +m, dd = +d, yy = +y;
    if (yy < 100) yy += yy < 70 ? 2000 : 1900;
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return "";
    var t = new Date(Date.UTC(yy, mm - 1, dd));
    // Rejects overflow such as 2/31/26, which Date would roll into March.
    if (t.getUTCMonth() !== mm - 1 || t.getUTCDate() !== dd) return "";
    return t.toISOString().slice(0, 10);
  }

  var pretty = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC", month: "short", day: "numeric", year: "numeric"
  });
  function label(s) {
    var p = s.split("-");
    return pretty.format(new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])));
  }

  function parse(raw) {
    var rest = raw;
    var lo = "", hi = "";

    var m = rest.match(RANGE);
    if (m) {
      var a = iso(m[1], m[2], m[3]);
      var b = iso(m[4], m[5], m[6]);
      if (a && b) {
        lo = a < b ? a : b;
        hi = a < b ? b : a;
        rest = rest.replace(m[0], " ");
      }
    }

    if (!lo) {
      var found = [];
      ONE.lastIndex = 0;
      var one;
      while ((one = ONE.exec(rest)) !== null) {
        var v = iso(one[1], one[2], one[3]);
        if (v) found.push({ raw: one[0], v: v });
      }
      if (found.length === 1) {
        lo = hi = found[0].v;
        rest = rest.replace(found[0].raw, " ");
      } else if (found.length > 1) {
        // Two bare dates with no separator still read as a range.
        var vs = found.map(function (f) { return f.v; }).sort();
        lo = vs[0];
        hi = vs[vs.length - 1];
        found.forEach(function (f) { rest = rest.replace(f.raw, " "); });
      }
    }

    return {
      terms: rest.toLowerCase().split(/\s+/).filter(Boolean),
      lo: lo,
      hi: hi,
      note: !lo ? "" : lo === hi ? label(lo) : label(lo) + " – " + label(hi)
    };
  }

  /* ---------- filtering ---------- */

  function apply() {
    var p = parse(q.value);
    var shown = 0;
    var firstVisible = null;

    rows.forEach(function (row) {
      var ok = true;
      for (var i = 0; i < p.terms.length; i++) {
        if (row._text.indexOf(p.terms[i]) === -1) { ok = false; break; }
      }
      if (ok && p.lo && row._date < p.lo) ok = false;
      if (ok && p.hi && row._date > p.hi) ok = false;

      row.hidden = !ok;
      row.classList.remove("row-first");
      if (ok) {
        shown++;
        if (!firstVisible) firstVisible = row;
      }
    });

    // Row separators are top borders, so the topmost *visible* row needs its
    // own suppressed -- CSS alone cannot skip over the hidden rows between.
    if (firstVisible) firstVisible.classList.add("row-first");

    noMatch.hidden = shown !== 0;

    var filtering = p.terms.length > 0 || Boolean(p.lo);
    if (!filtering) {
      count.textContent = "";
    } else {
      var msg = shown === 0 ? "No matches"
        : "Showing " + shown + " of " + total + (pages > 1 ? " on this page" : "");
      count.textContent = p.note ? msg + " · " + p.note : msg;
    }
  }

  function resort() {
    rows
      .slice()
      .sort(function (a, b) {
        if (a._date === b._date) return 0;
        var older = a._date < b._date;
        return (newestFirst ? !older : older) ? -1 : 1;
      })
      .forEach(function (row) { list.appendChild(row); });
    apply(); // re-stamp row-first, the topmost row has changed
  }

  sortBtn.addEventListener("click", function () {
    newestFirst = !newestFirst;
    sortLabel.textContent = newestFirst ? "Newest" : "Oldest";
    sortBtn.setAttribute(
      "aria-label",
      "Sort by date, " + (newestFirst ? "newest" : "oldest") +
        " first. Activate to reverse."
    );
    resort();
  });

  /* ---------- keyboard navigation ---------- */

  // Read the DOM rather than the cached array: sorting reorders the rows, so
  // only the live document knows the order the reader actually sees.
  function visibleLinks() {
    return Array.prototype.filter
      .call(list.querySelectorAll(".row"), function (r) { return !r.hidden; })
      .map(function (r) { return r.querySelector(".row-link"); });
  }

  // delta > 0 moves down the matches, < 0 moves up. From the search box, down
  // lands on the top match; up from the top match returns to the search box.
  function move(from, delta) {
    var links = visibleLinks();
    if (!links.length) return;

    var i = links.indexOf(from);
    var next = i === -1 ? (delta > 0 ? 0 : links.length - 1) : i + delta;

    if (next < 0) {
      q.focus();
      return;
    }
    if (next >= links.length) next = links.length - 1; // stop at the bottom
    links[next].focus();
  }

  q.addEventListener("input", apply);
  q.addEventListener("search", apply); // the field's own clear button
  q.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && q.value) {
      q.value = "";
      apply();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault(); // otherwise the caret jumps to the end of the text
      move(null, 1);
    }
  });

  list.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    var link = e.target.closest ? e.target.closest(".row-link") : null;
    if (!link) return;
    e.preventDefault(); // otherwise the page scrolls as well
    move(link, e.key === "ArrowDown" ? 1 : -1);
  });

  tools.hidden = false;
  apply();

  /* ---------- back to top ---------- */

  var toTop = document.getElementById("to-top");
  if (toTop) {
    toTop.hidden = false;
    var showAfter = function () {
      toTop.classList.toggle("is-shown", window.scrollY > 320);
    };
    showAfter();
    window.addEventListener("scroll", showAfter, { passive: true });
    toTop.addEventListener("click", function () {
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      q.focus({ preventScroll: true });
    });
  }

  /* ---------- activity graph ---------- */

  /* The graph covers the whole archive while this page holds one slice of it,
     so a day may belong to another page. Each cell carries the page its posts
     landed on; a different one is a navigation, not a scroll.

     Matched on [data-day] rather than a class, because the two activity
     components -- the day calendar and the month pulse -- both emit it and
     neither should need this file to know about it. */
  function jumpTo(day) {
    var row = list.querySelector('.row[data-date="' + day + '"]');
    if (!row) return false;
    // A filter could be hiding the day being jumped to, so clear it first.
    if (q.value) {
      q.value = "";
      apply();
    }
    row.scrollIntoView({ block: "center", behavior: "smooth" });
    rows.forEach(function (r) { r.classList.remove("row-jumped"); });
    // Restart the flash even if the same day is chosen twice.
    void row.offsetWidth;
    row.classList.add("row-jumped");
    var link = row.querySelector(".row-link");
    if (link) link.focus({ preventScroll: true });
    return true;
  }

  var activity = document.getElementById("activity");
  if (activity) {
    activity.hidden = false;

    activity.addEventListener("click", function (e) {
      var cell = e.target.closest ? e.target.closest("[data-day]") : null;
      if (!cell) return;
      var day = cell.getAttribute("data-day");
      var want = Number(cell.getAttribute("data-page")) || 1;
      if (want !== thisPage) {
        window.location.href = pageHref(want) + "#d" + day;
        return;
      }
      jumpTo(day);
    });
  }

  // Arriving from a day picked on another page.
  if (/^#d\d{4}-\d{2}-\d{2}$/.test(window.location.hash)) {
    jumpTo(window.location.hash.slice(2));
  }
})();
