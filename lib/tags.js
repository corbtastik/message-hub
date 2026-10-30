/* Tags.
 *
 * Eleventy's `tags` is also how a post joins a collection, and posts.json
 * already uses it to put every post in `collections.posts`. A post that adds
 * its own tags does not lose that -- Eleventy 3 deep-merges the two, so front
 * matter `tags: [garden]` comes out as [posts, garden] -- but it does mean
 * "posts" rides along in every list and has to be filtered out of anything a
 * reader sees.
 *
 * Add another directory-level tag and it belongs in STRUCTURAL_TAGS too, or
 * it will show up as a chip and get a page of its own. */
export const STRUCTURAL_TAGS = ["posts", "all"];

export const userTags = (tags) =>
  (Array.isArray(tags) ? tags : tags ? [tags] : []).filter(
    (t) => !STRUCTURAL_TAGS.includes(t)
  );

/** Every tag in use with its count, commonest first, for the tag pages. */
export function tagList(collection) {
  const counts = new Map();
  for (const item of collection.getFilteredByTag("posts")) {
    for (const tag of userTags(item.data.tags)) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
