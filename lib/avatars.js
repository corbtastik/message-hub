/* Author portraits.
 *
 * Every name resolves the same way, the site author included: the drawn
 * portrait at assets/img/people/<slug>.svg when one exists, and null when it
 * does not, which the template renders as a neutral figure. Adding a
 * contributor is adding a file named after them -- there is no register to
 * update, and a name with no portrait degrades rather than 404s.
 *
 * tools/make-avatar.js draws them. It shares this slug rule, so a name always
 * produces the same filename on both sides. */
import fs from "node:fs";
import path from "node:path";

export const personSlug = (name) =>
  String(name)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function avatar(who) {
  if (!who) return null;
  const rel = `assets/img/people/${personSlug(who)}.svg`;
  return fs.existsSync(path.join("src", rel)) ? `/${rel}` : null;
}
