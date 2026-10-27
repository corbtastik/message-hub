import fs from "node:fs";
import { newRefRegex, bookFor, bibleGatewayUrl } from "./lib/scripture.js";

/* The two dark-theme blocks in app.css have to carry the same tokens: one
 * answers the system preference, the other the manual toggle. They have
 * drifted once already -- the activity-graph colours landed in one and not
 * the other, so forcing dark showed light-mode squares on black. Nothing
 * about that fails visibly, so fail the build instead. */
function assertDarkThemesMatch() {
  const css = fs.readFileSync("src/assets/css/app.css", "utf8");
  const grab = (re) => {
    const m = css.match(re);
    if (!m) throw new Error("app.css: could not find a dark-theme block");
    return m[1]
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("/*") && !l.startsWith("color-scheme"))
      .sort();
  };
  const media = grab(/:root:not\(\[data-theme="light"\]\)\{\n([\s\S]*?)\n {2}\}\n\}/);
  const attr = grab(/:root\[data-theme="dark"\]\{\n([\s\S]*?)\n\}/);
  const only = (a, b) => a.filter((x) => !b.includes(x));
  // Also compare against the light :root. A token renamed in :root but left
  // stale in both dark blocks keeps them matching each other while dark
  // silently falls back to the light value -- which is how the activity
  // graph nearly shipped with light-mode squares on black.
  const names = (decls) => decls.map((d) => d.split(":")[0].trim()).sort();
  const lightRoot = grab(/:root\{\n([\s\S]*?)\n\}/);
  const lightNames = names(lightRoot).filter((n) => n.startsWith("--"));
  const darkNames = names(media).filter((n) => n.startsWith("--"));
  const orphan = darkNames.filter((n) => !lightNames.includes(n));
  const unthemed = lightNames.filter(
    (n) => !darkNames.includes(n) && !["--sf", "--top-inset"].includes(n)
  );
  if (orphan.length || unthemed.length) {
    throw new Error(
      "app.css theme tokens are out of step.\n" +
        "  defined in dark but not in :root: " + (orphan.join(", ") || "-") + "\n" +
        "  in :root with no dark value:      " + (unthemed.join(", ") || "-")
    );
  }

  if (media.join("|") !== attr.join("|")) {
    throw new Error(
      "app.css dark themes have drifted.\n" +
        "  only under prefers-color-scheme: " + (only(media, attr).join(", ") || "-") + "\n" +
        "  only under [data-theme=dark]:     " + (only(attr, media).join(", ") || "-")
    );
  }
}

export default function (eleventyConfig) {
  assertDarkThemesMatch();
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addWatchTarget("src/assets");

  // Curly quotes and proper dashes, so pasted-in text reads like the original
  // message rather than like typewriter output.
  eleventyConfig.amendLibrary("md", (md) =>
    md.set({ html: true, linkify: true, typographer: true })
  );

  // Devos, newest first.
  eleventyConfig.addCollection("devos", (collection) =>
    collection.getFilteredByGlob("src/devos/*.md").sort((a, b) => b.date - a.date)
  );

  // Dates come from front matter as plain YYYY-MM-DD, so format in UTC to
  // avoid the local timezone pulling a devo back onto the previous day.
  const fmt = (date, opts) =>
    new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts }).format(date);

  eleventyConfig.addFilter("weekday", (d) => fmt(d, { weekday: "long" }));
  eleventyConfig.addFilter("longDate", (d) =>
    fmt(d, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
  );
  eleventyConfig.addFilter("shortDate", (d) =>
    fmt(d, { month: "numeric", day: "numeric", year: "2-digit" })
  );
  eleventyConfig.addFilter("isoDate", (d) => d.toISOString().slice(0, 10));

  // A long devo arrives as several texts in a row. Authors split them with a
  // `***` thematic break; each chunk becomes its own bubble.
  eleventyConfig.addFilter("bubbles", (html) =>
    String(html)
      .split(/<hr\s*\/?>/)
      .map((chunk) => chunk.trim())
      .filter(Boolean)
  );

  // Strip markup down to plain text.
  const plain = (html) =>
    String(html)
      .replace(/<[^>]+>/g, " ")
      .replace(/&#8203;|&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();

  // Plain-text preview for the conversation list.
  eleventyConfig.addFilter("preview", (html, max = 140) => {
    const text = plain(html);
    return text.length > max ? text.slice(0, max).trimEnd() + "\u2026" : text;
  });

  // Everything the client-side search matches against, lowercased once at
  // build time so filtering never has to case-fold every devo per keystroke.
  eleventyConfig.addFilter("searchText", (...parts) =>
    plain(parts.filter(Boolean).join(" ")).toLowerCase()
  );


  /* ---------- external links and scripture references ----------
   *
   * Two passes over the rendered devo pages, both operating only on text
   * that sits outside an existing <a>, <script> or <style>:
   *
   *   1. turn scripture references into BibleGateway links (NKJV, which is
   *      the translation he quotes), and
   *   2. give every external link target=_blank and rel=noopener.
   *
   * The parsing rules live in lib/scripture.js, shared with the scripture
   * index, so the page that lists a verse and the page that links it can
   * never disagree about what counts as a reference. */

  function linkRefsInText(text) {
    return text.replace(newRefRegex(), (whole, rawBook, ch, v1, v2) => {
      const book = bookFor(rawBook);
      if (!book) return whole; // unknown book: leave his text alone
      return `<a href="${bibleGatewayUrl(book, ch, v1, v2)}">${whole}</a>`;
    });
  }

  // Walk the markup, skipping anything already inside a link, a script or a
  // style, so references are never linked twice or rewritten inside code.
  function onTextNodes(html, fn) {
    let depth = 0;
    return html
      .split(/(<[^>]+>)/)
      .map((part) => {
        if (part.startsWith("<")) {
          if (/^<(a|script|style)\b/i.test(part)) depth++;
          else if (/^<\/(a|script|style)>/i.test(part)) depth = Math.max(0, depth - 1);
          return part;
        }
        return depth ? part : fn(part);
      })
      .join("");
  }

  eleventyConfig.addTransform("scriptureLinks", function (content) {
    if (!(this.page.outputPath || "").endsWith(".html")) return content;
    if (!(this.page.url || "").startsWith("/devos/")) return content;
    return onTextNodes(content, linkRefsInText);
  });

  // Every link that leaves the site opens in a new tab. Runs after the pass
  // above so the BibleGateway links it created are covered too.
  eleventyConfig.addTransform("externalLinks", function (content) {
    if (!(this.page.outputPath || "").endsWith(".html")) return content;
    return content.replace(/<a\s+href="(https?:\/\/[^"]*)"([^>]*)>/g, (m, href, rest) => {
      if (/target=/.test(rest)) return m;
      return `<a href="${href}"${rest} target="_blank" rel="noopener">`;
    });
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
