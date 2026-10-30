/* Reading the custom properties out of app.css.
 *
 * Both build guards need the same thing -- which tokens each theme block
 * declares -- and each used to find them with its own regex. Two patterns that
 * had to agree about what a declaration looks like, with nothing connecting
 * them. This is the one parser; the guards assert over what it returns.
 *
 * It is deliberately strict about the block shapes rather than forgiving: a
 * stylesheet that no longer matches should fail loudly here, not silently
 * return an empty set and let a guard pass because it found nothing to check. */

/** Declarations in one block, as an ordered [name, value] list. */
function declarations(body) {
  return [...body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)].map((m) => [
    m[1],
    m[2].trim(),
  ]);
}

function block(css, re, what) {
  const m = css.match(re);
  if (!m) throw new Error(`app.css: could not find ${what}`);
  return declarations(m[1]);
}

/**
 * The three blocks that carry colour tokens:
 *   root      :root                              -- light, and the font stacks
 *   media     the prefers-color-scheme dark block
 *   attr      the [data-theme="dark"] block
 *
 * Returned as [name, value] pairs so a caller can compare names, values, or
 * both without re-parsing.
 */
export function readThemeBlocks(css) {
  return {
    root: block(css, /:root\{\n([\s\S]*?)\n\}/, ":root"),
    media: block(
      css,
      /:root:not\(\[data-theme="light"\]\)\{\n([\s\S]*?)\n {2}\}\n\}/,
      "the prefers-color-scheme dark block"
    ),
    attr: block(css, /:root\[data-theme="dark"\]\{\n([\s\S]*?)\n\}/, 'the [data-theme="dark"] block'),
  };
}

export const names = (decls) => decls.map(([name]) => name);
export const serialise = (decls) =>
  decls.map(([n, v]) => `${n}:${v}`).sort().join("|");
