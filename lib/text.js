/* Turning rendered post HTML into the plain text the list needs. */

/** Strip markup and entities down to a single run of words. */
export const plain = (html) =>
  String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&#8203;|&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

/* A long post arrives as several texts in a row. Authors split them with a
 * `***` thematic break; each chunk becomes its own bubble. */
export const bubbles = (html) =>
  String(html)
    .split(/<hr\s*\/?>/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

/* Plain-text preview for the conversation list.
 *
 * Truncation walks grapheme clusters rather than UTF-16 units. Slicing an
 * emoji down the middle leaves a lone surrogate, which the browser draws as a
 * replacement character, and cutting a ZWJ sequence or a skin-tone modifier
 * turns one glyph into two. Posts carry emoji, so both are reachable -- it
 * only takes a post with no `summary`, which is a documented way to write
 * one. */
const graphemes = new Intl.Segmenter("en", { granularity: "grapheme" });

export function preview(html, max = 140) {
  const text = plain(html);
  if (text.length <= max) return text;
  let out = "";
  for (const { segment } of graphemes.segment(text)) {
    if (out.length + segment.length > max) break;
    out += segment;
  }
  return out.trimEnd() + "…";
}

/* Everything the client-side search matches against, lowercased once at build
 * time so filtering never has to case-fold every post per keystroke. */
export const searchText = (...parts) =>
  plain(parts.filter(Boolean).join(" ")).toLowerCase();
