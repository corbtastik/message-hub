import fs from "node:fs";
import path from "node:path";
import { TOKENS, paletteCss } from "./lib/palette.js";

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
    (n) => !darkNames.includes(n) && !["--sf", "--mono", "--top-inset"].includes(n)
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

/* A palette overrides every colour token at once. One it does not set stays
 * at the default -- a white bubble on a dark palette, say -- and nothing
 * fails, it just looks broken on 26 pages. So check the mapping in
 * lib/palette.js against :root in both directions. */
const NOT_COLOUR = ["--sf", "--mono", "--top-inset"];
function assertPaletteCoversTokens() {
  const css = fs.readFileSync("src/assets/css/app.css", "utf8");
  const root = css.match(/:root\{\n([\s\S]*?)\n\}/);
  if (!root) throw new Error("app.css: could not find :root");
  const declared = [...root[1].matchAll(/(--[a-z-]+)\s*:/g)]
    .map((m) => m[1])
    .filter((n) => !NOT_COLOUR.includes(n));
  const mapped = TOKENS.map(([n]) => "--" + n);

  const missing = declared.filter((n) => !mapped.includes(n));
  const extra = mapped.filter((n) => !declared.includes(n));
  const dupes = mapped.filter((n, i) => mapped.indexOf(n) !== i);
  if (missing.length || extra.length || dupes.length) {
    throw new Error(
      "lib/palette.js and :root in app.css disagree.\n" +
        "  in :root but no palette value: " + (missing.join(", ") || "-") + "\n" +
        "  mapped but not a :root token:  " + (extra.join(", ") || "-") + "\n" +
        "  mapped twice:                  " + (dupes.join(", ") || "-")
    );
  }
}

export default function (eleventyConfig) {
  assertDarkThemesMatch();
  assertPaletteCoversTokens();
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addWatchTarget("src/assets");

  // Curly quotes and proper dashes, so pasted-in text reads like the original
  // message rather than like typewriter output.
  eleventyConfig.amendLibrary("md", (md) =>
    md.set({ html: true, linkify: true, typographer: true })
  );

  // Posts, newest first.
  eleventyConfig.addCollection("posts", (collection) =>
    collection.getFilteredByGlob("src/posts/*.md").sort((a, b) => b.date - a.date)
  );

  // Dates come from front matter as plain YYYY-MM-DD, so format in UTC to
  // avoid the local timezone pulling a post back onto the previous day.
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

  // A long post arrives as several texts in a row. Authors split them with a
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

  /* Plain-text preview for the conversation list. Truncation walks grapheme
   * clusters rather than UTF-16 units: slicing an emoji down the middle
   * leaves a lone surrogate, which the browser draws as a replacement
   * character, and cutting a ZWJ sequence or a skin-tone modifier turns one
   * glyph into two. Posts carry emoji, so both are reachable. */
  const graphemes = new Intl.Segmenter("en", { granularity: "grapheme" });
  eleventyConfig.addFilter("preview", (html, max = 140) => {
    const text = plain(html);
    if (text.length <= max) return text;
    let out = "";
    for (const { segment } of graphemes.segment(text)) {
      if (out.length + segment.length > max) break;
      out += segment;
    }
    return out.trimEnd() + "\u2026";
  });

  // Everything the client-side search matches against, lowercased once at
  // build time so filtering never has to case-fold every post per keystroke.
  eleventyConfig.addFilter("searchText", (...parts) =>
    plain(parts.filter(Boolean).join(" ")).toLowerCase()
  );

  /* Which paginated page a day's posts land on. The activity graph spans the
   * whole archive while a list page holds only one slice of it, so a day cell
   * has to know where to send the reader -- otherwise clicking an older date
   * scrolls to a row that is not in the document and nothing happens. */
  eleventyConfig.addFilter("pageForDate", (posts, iso, perPage) => {
    const i = posts.findIndex((p) => p.date.toISOString().slice(0, 10) === iso);
    return i === -1 ? 1 : Math.floor(i / (perPage > 0 ? perPage : 50)) + 1;
  });

  /* ---------- tags ----------
   *
   * Eleventy's `tags` is also how a post joins a collection, and posts.json
   * already uses it to put every post in `collections.posts`. A post that
   * adds its own tags does not lose that -- Eleventy 3 deep-merges the two,
   * so front matter `tags: [garden]` comes out as [posts, garden] -- but it
   * does mean "posts" rides along in the list and has to be filtered out of
   * anything the reader sees. */
  const STRUCTURAL_TAGS = ["posts", "all"];
  const userTags = (tags) =>
    (Array.isArray(tags) ? tags : tags ? [tags] : []).filter(
      (t) => !STRUCTURAL_TAGS.includes(t)
    );

  eleventyConfig.addFilter("userTags", userTags);

  // Every tag in use, with its count, for the tag pages and the tag index.
  eleventyConfig.addCollection("tagList", (collection) => {
    const counts = new Map();
    for (const item of collection.getFilteredByTag("posts")) {
      for (const tag of userTags(item.data.tags)) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  });

  /* ---------- author avatars ----------
   *
   * Every name resolves the same way, the site author included: the drawn
   * portrait at assets/img/people/<slug>.svg when one exists, and the neutral
   * figure in the template when it does not. A new author needs no
   * configuration, just a file named after them, and nothing breaks if there
   * isn't one. */
  const personSlug = (name) =>
    String(name)
      .toLowerCase()
      .replace(/['\u2019]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  eleventyConfig.addFilter("avatar", (who) => {
    if (!who) return null;
    const rel = `assets/img/people/${personSlug(who)}.svg`;
    return fs.existsSync(path.join("src", rel)) ? `/${rel}` : null;
  });

  /* ---------- attachments ----------
   *
   * A file with no sensible inline rendering at a bubble's width -- a PDF,
   * a zip -- arrives as a row: icon, name, size, the way Messages shows a
   * document. The figures are read off the file at build time rather than
   * typed into the post, so they cannot drift from what is actually served,
   * and a missing file fails the build instead of shipping a dead link.
   *
   *   {% attachment "/assets/files/notes.pdf" %}
   *   {% attachment "/assets/files/notes.pdf", "Trip notes" %}
   */
  const fileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    const mb = kb / 1024;
    return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  };

  // Page count straight out of the PDF bytes. Works on an uncompressed file;
  // one that keeps its page tree in an object stream gives nothing back, and
  // the row simply leaves the page count out rather than guessing.
  const pdfPages = (buf) => {
    const text = buf.toString("latin1");
    const direct = text.match(/\/Type\s*\/Page[^s]/g);
    if (direct) return direct.length;
    const counts = [...text.matchAll(/\/Count\s+(\d+)/g)].map((m) => Number(m[1]));
    return counts.length ? Math.max(...counts) : null;
  };

  eleventyConfig.addShortcode("attachment", function (href, label) {
    const file = path.join("src", href.replace(/^\//, ""));
    if (!fs.existsSync(file)) {
      throw new Error(`attachment: no such file ${file} (referenced as ${href})`);
    }
    const buf = fs.readFileSync(file);
    const name = label || path.basename(file);
    const ext = path.extname(file).replace(".", "").toUpperCase();
    const bits = [ext];
    if (ext === "PDF") {
      const pages = pdfPages(buf);
      if (pages) bits.push(`${pages} page${pages === 1 ? "" : "s"}`);
    }
    bits.push(fileSize(buf.length));
    const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
    return (
      `<a class="attach" href="${esc(href)}">` +
        /* SF Symbols doc */
        `<svg class="attach-icon" width="16" height="20" viewBox="0 0 16 20" fill="none" aria-hidden="true">` +
          `<path d="M1.9 1.6h7l5.2 5.2v11.6a.6.6 0 0 1-.6.6H1.9a.6.6 0 0 1-.6-.6V2.2a.6.6 0 0 1 .6-.6Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>` +
          `<path d="M8.8 1.8v5.3h5.3" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>` +
        `</svg>` +
        `<span class="attach-body">` +
          `<span class="attach-name">${esc(name)}</span>` +
          `<span class="attach-meta">${esc(bits.join(" \u00b7 "))}</span>` +
        `</span>` +
        /* SF Symbols chevron.right */
        `<svg class="attach-go" width="7" height="12" viewBox="0 0 7 12" fill="none" aria-hidden="true">` +
          `<path d="M1.2 1 6 6l-4.8 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>` +
        `</svg>` +
      `</a>`
    );
  });

  /* ---------- external links ----------
   *
   * Every link that leaves the site opens in a new tab. A post is read as a
   * text message, so a tapped link should not replace the thread. */
  eleventyConfig.addTransform("externalLinks", function (content) {
    if (!(this.page.outputPath || "").endsWith(".html")) return content;
    return content.replace(/<a\s+href="(https?:\/\/[^"]*)"([^>]*)>/g, (m, href, rest) => {
      if (/target=/.test(rest)) return m;
      return `<a href="${href}"${rest} target="_blank" rel="noopener">`;
    });
  });

  /* One rule per palette, written straight into the output rather than kept
   * in src/. It is generated, so it should not be a file anyone can edit by
   * hand and expect to survive a build. */
  eleventyConfig.on("eleventy.after", ({ dir }) => {
    const palettes = JSON.parse(fs.readFileSync("src/_data/palettes.json", "utf8"));
    const out = path.join(dir.output, "assets", "css", "palettes.css");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, paletteCss(palettes) + "\n");
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
