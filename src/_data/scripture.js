/* Builds the scripture index: every verse he cites, Genesis to Revelation,
 * each pointing at the devo or devos that quote it.
 *
 * Reads the Markdown directly rather than going through collections, so the
 * page does not depend on every devo having rendered first. The parsing
 * rules come from lib/scripture.js, the same ones the build-time linker
 * uses, so this list and the links on the devo pages always agree. */

import fs from "node:fs";
import path from "node:path";
import { BOOK_ORDER, findRefs, passageOf, bibleGatewayUrl } from "../../lib/scripture.js";

const DEVOS = "src/devos";

function frontMatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return null;
  const meta = {};
  for (const line of m[1].split("\n")) {
    const f = line.match(/^(\w+):\s*(.*)$/);
    if (f) meta[f[1]] = f[2].trim().replace(/^"(.*)"$/, "$1");
  }
  return { meta, body: m[2] };
}

export default function () {
  const byRef = new Map();

  for (const file of fs.readdirSync(DEVOS).filter((f) => f.endsWith(".md"))) {
    const parsed = frontMatter(fs.readFileSync(path.join(DEVOS, file), "utf8"));
    if (!parsed) continue;
    const { meta, body } = parsed;

    // UTC, matching how eleventy.config.js formats dates elsewhere, so a
    // local timezone cannot pull a devo onto the previous day.
    const [y, mo, d] = String(meta.date).split("-").map(Number);
    const devo = {
      title: meta.title || file,
      date: new Date(Date.UTC(y, mo - 1, d)),
      iso: meta.date,
      // same rule Eleventy uses for fileSlug: the date prefix is dropped
      url: "/devos/" + file.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "") + "/",
    };

    for (const ref of findRefs(body)) {
      if (!byRef.has(ref.id)) byRef.set(ref.id, { ...ref, devos: [] });
      byRef.get(ref.id).devos.push(devo);
    }
  }

  // Group by book in canonical order, then chapter, then verse.
  const books = [];
  for (const book of BOOK_ORDER) {
    const refs = [...byRef.values()]
      .filter((r) => r.book === book)
      .sort((a, b) => a.chapter - b.chapter || a.verse - b.verse || (a.verseEnd || 0) - (b.verseEnd || 0));
    if (!refs.length) continue;

    books.push({
      book,
      refs: refs.map((r) => ({
        // "3:4" or "19:23-26" -- the book name is already the heading
        label: `${r.chapter}:${r.verse}${r.verseEnd ? "-" + r.verseEnd : ""}`,
        passage: passageOf(r.book, r.chapter, r.verse, r.verseEnd),
        bible: bibleGatewayUrl(r.book, r.chapter, r.verse, r.verseEnd, "&"),
        devos: r.devos.sort((a, b) => a.date - b.date),
      })),
    });
  }

  const refCount = books.reduce((n, b) => n + b.refs.length, 0);
  return { books, refCount, bookCount: books.length };
}
