/* Registration only.
 *
 * Everything with logic in it lives in lib/ and is unit-testable without
 * Eleventy; this file says what the build is made of and nothing else. */
import fs from "node:fs";
import path from "node:path";

import { assertDarkThemesMatch, assertPaletteCoversTokens } from "./lib/guards.js";
import { paletteCss } from "./lib/palette.js";
import { weekday, longDate, shortDate, isoDate } from "./lib/dates.js";
import { bubbles, preview, searchText } from "./lib/text.js";
import { userTags, tagList } from "./lib/tags.js";
import { avatar } from "./lib/avatars.js";
import { attachment } from "./lib/attachment.js";

export default function (eleventyConfig) {
  // Fail early rather than ship colours that are silently wrong.
  assertDarkThemesMatch();
  assertPaletteCoversTokens();

  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addWatchTarget("src/assets");
  eleventyConfig.addWatchTarget("lib");

  // Curly quotes and proper dashes, so pasted-in text reads like the original
  // message rather than like typewriter output.
  eleventyConfig.amendLibrary("md", (md) =>
    md.set({ html: true, linkify: true, typographer: true })
  );

  // ---------- collections ----------
  eleventyConfig.addCollection("posts", (c) =>
    c.getFilteredByGlob("src/posts/*.md").sort((a, b) => b.date - a.date)
  );
  eleventyConfig.addCollection("tagList", tagList);

  // ---------- filters ----------
  eleventyConfig.addFilter("weekday", weekday);
  eleventyConfig.addFilter("longDate", longDate);
  eleventyConfig.addFilter("shortDate", shortDate);
  eleventyConfig.addFilter("isoDate", isoDate);
  eleventyConfig.addFilter("bubbles", bubbles);
  eleventyConfig.addFilter("preview", preview);
  eleventyConfig.addFilter("searchText", searchText);
  eleventyConfig.addFilter("userTags", userTags);
  eleventyConfig.addFilter("avatar", avatar);

  /* Which paginated page a day's posts land on. The activity graph spans the
   * whole archive while a list page holds one slice of it, so a cell has to
   * know where to send the reader -- otherwise clicking an older date scrolls
   * to a row that is not in the document and nothing happens. */
  eleventyConfig.addFilter("pageForDate", (posts, iso, perPage) => {
    const i = posts.findIndex((p) => p.date.toISOString().slice(0, 10) === iso);
    return i === -1 ? 1 : Math.floor(i / (perPage > 0 ? perPage : 50)) + 1;
  });

  // ---------- shortcodes ----------
  eleventyConfig.addShortcode("attachment", attachment);

  /* ---------- transforms ----------
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

  /* ---------- generated output ----------
   *
   * One rule per palette, written straight into the output rather than kept
   * in src/. It is generated, so it should not be a file anyone can edit by
   * hand and expect to survive a build. */
  eleventyConfig.on("eleventy.after", ({ dir }) => {
    const palettes = JSON.parse(fs.readFileSync("src/_data/palettes.json", "utf8"));
    const out = path.join(dir.output, "assets", "css", "palettes.css");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, paletteCss(palettes) + "\n");
  });

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
