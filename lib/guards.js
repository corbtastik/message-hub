/* Build-time checks on things that break silently.
 *
 * Both of these exist because of bugs that shipped, or nearly did, without
 * raising anything: the stylesheet still parsed, the page still rendered, and
 * only the colours were wrong. Neither is a lint rule for its own sake.
 *
 * They share one parser (lib/tokens.js) rather than carrying a regex each.
 */
import fs from "node:fs";
import { readThemeBlocks, names, serialise } from "./tokens.js";
import { TOKENS } from "./palette.js";

/* Tokens that are not colours, so they are expected in :root with no dark
 * counterpart and no palette value. A font stack is the same in both themes
 * and under every palette. */
const NOT_COLOUR = ["--sf", "--mono", "--top-inset"];

const CSS = "src/assets/css/app.css";
const read = () => readThemeBlocks(fs.readFileSync(CSS, "utf8"));

/* The two dark blocks have to carry the same tokens: one answers the system
 * preference, the other the manual toggle. They have drifted once already --
 * the activity-graph colours landed in one and not the other, so forcing dark
 * showed light-mode colours on black. Nothing about that fails visibly. */
export function assertDarkThemesMatch() {
  const { root, media, attr } = read();

  // Compare against :root too. A token renamed in :root but left stale in
  // both dark blocks keeps the dark pair agreeing with each other while dark
  // silently falls back to the light value.
  const lightNames = names(root).filter((n) => !NOT_COLOUR.includes(n));
  const darkNames = names(media);
  const orphan = darkNames.filter((n) => !names(root).includes(n));
  const unthemed = lightNames.filter((n) => !darkNames.includes(n));
  if (orphan.length || unthemed.length) {
    throw new Error(
      "app.css theme tokens are out of step.\n" +
        "  defined in dark but not in :root: " + (orphan.join(", ") || "-") + "\n" +
        "  in :root with no dark value:      " + (unthemed.join(", ") || "-")
    );
  }

  if (serialise(media) !== serialise(attr)) {
    const only = (a, b) => {
      const other = serialise(b).split("|");
      return a.map(([n, v]) => `${n}:${v}`).filter((d) => !other.includes(d));
    };
    throw new Error(
      "app.css dark themes have drifted.\n" +
        "  only under prefers-color-scheme: " + (only(media, attr).join(", ") || "-") + "\n" +
        "  only under [data-theme=dark]:     " + (only(attr, media).join(", ") || "-")
    );
  }
}

/* A palette overrides every colour token at once. One it does not set stays
 * at the default -- a white bubble on a dark palette -- and nothing fails, it
 * just looks broken on every page. So check the mapping against :root in both
 * directions, and for a token mapped twice. */
export function assertPaletteCoversTokens() {
  const declared = names(read().root).filter((n) => !NOT_COLOUR.includes(n));
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
