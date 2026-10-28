/* Pagination for the conversation list.
 *
 * It lives here rather than in index.njk's front matter so the page size can
 * come from site.json: front matter is static YAML and cannot read it. */
import fs from "node:fs";

const site = JSON.parse(fs.readFileSync("src/_data/site.json", "utf8"));

export default {
  pagination: {
    data: "collections.posts",
    size: site.perPage > 0 ? site.perPage : 50,
    alias: "pagePosts",
  },
  // Page one keeps the bare root, so the site's front door never becomes
  // /page/1/ and nothing that already links to / has to change.
  permalink: (data) =>
    data.pagination.pageNumber === 0
      ? "/index.html"
      : `/page/${data.pagination.pageNumber + 1}/index.html`,
};
