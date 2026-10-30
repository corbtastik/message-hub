/* Attachments.
 *
 * A file with no sensible inline rendering at a bubble's width -- a PDF, a
 * zip -- arrives as a row: icon, name, size, the way Messages shows a
 * document. Everything after the name is read off the file at build time
 * rather than typed into the post, so it cannot drift from what is actually
 * served, and a path that resolves to nothing fails the build instead of
 * shipping a dead link.
 *
 *   {% attachment "/assets/files/notes.pdf" %}
 *   {% attachment "/assets/files/notes.pdf", "Trip notes" %}
 */
import fs from "node:fs";
import path from "node:path";

export const fileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
};

/* Page count straight out of the PDF bytes. Works on an uncompressed file;
 * one that keeps its page tree in a compressed object stream gives nothing
 * back, and the row leaves the count out rather than guessing. */
export const pdfPages = (buf) => {
  const text = buf.toString("latin1");
  const direct = text.match(/\/Type\s*\/Page[^s]/g);
  if (direct) return direct.length;
  const counts = [...text.matchAll(/\/Count\s+(\d+)/g)].map((m) => Number(m[1]));
  return counts.length ? Math.max(...counts) : null;
};

const esc = (t) =>
  String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

export function attachment(href, label) {
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

  return (
    `<a class="attach" href="${esc(href)}">` +
      /* SF Symbols doc */
      `<svg class="attach-icon" width="16" height="20" viewBox="0 0 16 20" fill="none" aria-hidden="true">` +
        `<path d="M1.9 1.6h7l5.2 5.2v11.6a.6.6 0 0 1-.6.6H1.9a.6.6 0 0 1-.6-.6V2.2a.6.6 0 0 1 .6-.6Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>` +
        `<path d="M8.8 1.8v5.3h5.3" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>` +
      `</svg>` +
      `<span class="attach-body">` +
        `<span class="attach-name">${esc(name)}</span>` +
        `<span class="attach-meta">${esc(bits.join(" · "))}</span>` +
      `</span>` +
      /* SF Symbols chevron.right */
      `<svg class="attach-go" width="7" height="12" viewBox="0 0 7 12" fill="none" aria-hidden="true">` +
        `<path d="M1.2 1 6 6l-4.8 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>` +
      `</svg>` +
    `</a>`
  );
}
