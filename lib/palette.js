/* The single mapping from a palette's seven source colours -- as stored per
 * palette in src/_data/palettes.json -- to the CSS custom properties app.css
 * actually consumes.
 *
 * Ported from yolo-11ty, whose themes.json these palettes come from. That
 * project learned the hard way that two copies of a mapping drift, so this is
 * the only one: the build emits assets/css/palettes.css from it, and the
 * browser does nothing but set `data-palette` on <html>. There is no runtime
 * copy to fall out of step.
 *
 * `assertPaletteCoversTokens()` in eleventy.config.js fails the build if this
 * list and :root in app.css disagree, in either direction. A palette that
 * misses a token leaves it at the default -- a white bubble on a dark palette
 * -- which is the kind of thing nobody notices until it ships. */

const hex = (h) => {
  const s = h.replace("#", "");
  const full = s.length === 3 ? [...s].map((c) => c + c).join("") : s;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};
const toHex = (rgb) =>
  "#" + rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");

/** `t` of `a` blended toward `b`; t=0 is all `a`. */
const mix = (a, b, t) => {
  const [x, y] = [hex(a), hex(b)];
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
};
const alpha = (h, a) => `rgb(${hex(h).join(" ")} / ${a})`;

/* [cssVariableName, fn(colors)] in emission order. Every colour token in
 * :root must appear here exactly once. The alpha-derived ones are ink over
 * the background: app.css hard-codes black-at-low-alpha for light and
 * white-at-low-alpha for dark, which generalises to `text` at that alpha. */
export const TOKENS = [
  ["bg",            (c) => c.bg],
  ["bubble",        (c) => c.surface],
  ["text",          (c) => c.text],
  ["meta",          (c) => mix(c.text, c.bg, 0.45)],
  ["name",          (c) => mix(c.heading, c.bg, 0.35)],
  ["sep",           (c) => alpha(c.text, 0.1)],
  ["glass",         (c) => alpha(mix(c.surface, c.bg, 0.35), 0.8)],
  ["glass-edge",    (c) => c.border],
  ["accent",        (c) => c.primary],
  ["link",          (c) => c.link],
  ["quote-edge",    (c) => c.border],
  ["quote-text",    (c) => mix(c.text, c.bg, 0.12)],
  ["field",         (c) => mix(c.surface, c.bg, 0.15)],
  ["control",       (c) => alpha(c.text, 0.055)],
  ["control-hover", (c) => alpha(c.text, 0.1)],
  ["hover",         (c) => alpha(c.text, 0.05)],
  ["clear-ring",    (c) => mix(c.text, c.bg, 0.55)],
  ["day-off",       (c) => alpha(c.text, 0.08)],
  ["day-on",        (c) => c.primary],
];

/* One rule per palette. light-dark() picks the right side from `color-scheme`,
 * which app.css already sets for both the system preference and the manual
 * toggle -- so the palette and the appearance stay independent axes without
 * this file knowing anything about either. */
export function paletteCss(palettes) {
  return palettes.themes
    .map((t) => {
      const decls = TOKENS.map(
        ([name, fn]) => `  --${name}:light-dark(${fn(t.light)},${fn(t.dark)});`
      ).join("\n");
      return `:root[data-palette="${t.id}"]{\n${decls}\n}`;
    })
    .join("\n");
}

/** Two colours per palette for the picker swatch, without re-deriving them. */
export const swatch = (t, mode) => ({ bg: t[mode].bg, dot: t[mode].primary });
