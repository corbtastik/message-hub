# message-hub: generalise it from "devos" to "posts"

*A prompt to hand to a fresh session working on this project. Delete this file
once the refactor is done.*

---

## What this project is

A small static-site framework built with Eleventy 3 that renders blog posts as
an **iOS Messages thread** — each post is a chat bubble with a timestamp,
sender name and avatar. The home page is the conversation list.

It was ported from a personal site (an archive of one author's daily
devotionals) and still carries that project's vocabulary. The code is sound;
the naming and one feature are too specific.

**Current features, all working:**

- Posts are Markdown + front matter in `src/devos/`, one file per post,
  named `YYYY-MM-DD-slug.md` (the date prefix is stripped from the URL).
- Home page: conversation list, client-side search (free text **and** typed
  dates like `5/21/26` or `5/1/26 to 5/15/26`), a sort toggle, arrow-key
  navigation through results, and a GitHub-style activity calendar whose
  squares link to that day in the list.
- Light/dark themes following the system, plus a manual toggle. **A build-time
  guard (`assertDarkThemesMatch()` in `eleventy.config.js`) fails the build if
  the theme token blocks drift — keep it passing.**
- A build-time transform gives every external link `target="_blank"
  rel="noopener"`.
- 20 sample posts, all invented placeholder content.

Read `docs/FRAMEWORK.md` first — it explains the layout, the search, the
theming and the deploy setup.

## What I want

Make it a **general blog framework**. Two changes:

### 1. Rename `devos` → `posts` everywhere

Known touch points (verify, don't trust this list blindly):

- `src/devos/` → `src/posts/`
- `src/devos/devos.json` → `src/posts/posts.json`. This is Eleventy's
  directory data file and **its filename must match the folder name**. It sets
  the layout, tag and permalink — update the permalink too.
- `src/_includes/devo.njk` → `post.njk`, and the `layout:` that references it.
- `collections.devos` → `collections.posts` in `src/index.njk` and
  `src/scripture.njk`.
- Counts in `eleventy.config.js`, `src/_data/activity.js`,
  `src/assets/js/search.js`, `src/_includes/base.njk`, `src/assets/css/app.css`,
  `docs/TEMPLATE.md`, `docs/FRAMEWORK.md`, `README.md`.
- The visible word "devos" in the UI (e.g. the "20 devos from …" byline and
  the search field's aria-label) should read "posts".

### 2. Remove the scripture feature entirely

It only makes sense for devotional writing. Delete:

- `lib/scripture.js`
- `src/_data/scripture.js`
- `src/scripture.njk` (the `/scripture/` index page)
- the `scriptureLinks` transform and its imports in `eleventy.config.js`
- the scripture-index CSS in `src/assets/css/app.css` (`.ref-*`, `.book-name`,
  `.crumb`, `.index-link` and friends)
- the "Scripture index" link on the home page
- the `scripture:` front-matter key — it is in all 20 samples and in
  `docs/TEMPLATE.md`

**Keep** the `externalLinks` transform — that one is generic and still wanted.

## A decision I need you to raise, not assume

The 20 sample posts are devotional in flavour: most open with a Bible
quotation, because they were written to exercise the scripture linking. With
that feature gone they will read oddly for a general blog.

Tell me what you recommend and why before rewriting them — whether to replace
them with neutral sample posts, keep them as-is, or something else. Don't
silently rewrite them.

## Constraints

- Keep the Messages-thread design and all other behaviour exactly as it is.
- Do not touch `/Users/corbs/dev/github/corbtastik/buddy-and-the-bible` — it is
  a separate, finished project.
- `firebase.json` has **no `site` pinned, deliberately**. Leave it that way.
- Commit as `Corbett Martin <corbtastik@gmail.com>`.

## Done means

`npm run build` is clean, the dark-theme guard still passes, the site renders
and behaves the same minus the scripture feature, no file or identifier says
"devo", and `README.md` / `docs/FRAMEWORK.md` match reality.
