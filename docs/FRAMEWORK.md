# Message Hub — framework notes

How the pieces fit together. For getting started, see the
[README](../README.md).

## Layout

```
src/
  index.njk            conversation list (home)
  scripture.njk        the scripture index at /scripture/
  _data/scripture.js   builds that index from the devo Markdown
  _data/activity.js    builds the calendar grid for the activity graph
  _data/site.json      title, author, description, url
  _includes/
    base.njk           <head>, meta and social tags
    devo.njk           the Messages thread
    theme-toggle.njk   the appearance button, used by both
  assets/css/app.css   all styles
  assets/js/search.js  list filtering, typed dates, sort, arrow keys
  assets/js/theme.js   the appearance toggle
  assets/img/          placeholder avatar and cluster (SVG)
  devos/
    devos.json         layout, tag and permalink for every devo
    *.md               one file per post (20 samples ship with it)
lib/scripture.js       reference parsing, shared by the linker and the index
docs/TEMPLATE.md       starting point for a new devo
docs/FRAMEWORK.md      this file
firebase.json          hosting config (no site pinned - see Deploying)
```

## Searching the list

The home page filters client-side as you type. Dates go in the same box as the
text -- there is no date picker:

| Typed                      | Effect                                  |
| -------------------------- | --------------------------------------- |
| `humility`                 | devos containing the word               |
| `haman humility`           | devos containing *both* words           |
| `5/21/26`                  | that single day                         |
| `5/1/26 to 5/15/26`        | that range, inclusive                   |
| `love 5/1/26 to 5/15/26`   | text and range together                 |

`to`, `-`, `–`, `..` and `through` all work as range separators, as does
writing two dates side by side. A reversed range is read the same as a forward
one. A string that looks like a date but is not one (`2/31/26`) stays a plain
text term rather than silently filtering. The result line echoes the dates it
understood, so a mistyped filter is visible. The one button reverses the sort.

From the search box, Down jumps to the top match and Down/Up walk the
matches in the order shown (so it follows the sort); Up from the top match
returns to the box, Enter opens the devo, Escape clears the search.

Each row carries its searchable text in a `data-text` attribute, so the index
is the page itself -- no extra request, and the list still renders unfiltered
with JavaScript off. At 45 devos that index is about 64 KB of a 104 KB page;
past roughly 300 devos it would be worth moving it to a separate fetched
`search.json`.

## Light and dark

Follows the system appearance the way Messages does, and the icon in the
header pins either one. The choice is kept in `localStorage` and applied by a
small inline script in `<head>` before first paint; picking whatever the
system is already showing drops the override rather than pinning it, so the
page goes back to following the system.

Every colour is a token, defined on `:root` for light and repeated in two
dark blocks -- one under `@media (prefers-color-scheme: dark)` and one under
`:root[data-theme="dark"]`. `assertDarkThemesMatch()` in
`eleventy.config.js` fails the build when they fall out of step, naming the
offending tokens. It checks two things, because both have already happened
while building the activity graph:

- the two dark blocks must match each other -- the graph's colours once
  landed in the media query only, so forcing dark through the toggle showed
  light-mode squares on black;
- they must declare the same token *names* as `:root` -- renaming a token in
  `:root` while both dark blocks kept the old name left them agreeing with
  each other and silently falling back to the light value.

Neither failed visibly, which is the reason the check exists. Keep all light
tokens in the single `:root` block; a second one would hide from the check. Forcing a theme
also sets `color-scheme`, without which the browser keeps painting native
controls and scrollbars for the system appearance.

## Typography

iOS Messages renders in SF Pro. On Apple devices `-apple-system` *is* SF Pro,
so the thread matches the original screenshots exactly with no download.
Apple's licence forbids web-embedding SF Pro, so other platforms fall back to
[Inter](https://rsms.me/inter/), which was drawn as an open stand-in for it,
loaded from Google Fonts.

Order matters in that stack: current Chrome normalises `BlinkMacSystemFont`
to `system-ui` on *every* platform, so it has to sit after `Inter` -- ahead of
it, Windows would get Segoe UI and Android would get Roboto. Drop the Google
Fonts `<link>` in `src/_includes/base.njk` if you would rather have no
external dependency; Apple devices are unaffected either way.

## Scripture

Every reference on a devo page links to that passage on BibleGateway in
NKJV, the translation the posts quote. Nothing is marked up by hand: a build-time
transform in `eleventy.config.js` finds references in the rendered HTML,
skipping anything already inside a link, a script or a style. A second
transform gives every off-site link `target="_blank"` and `rel="noopener"`.

His text is never changed. Where his wording and the URL have to differ the
link text keeps what he wrote and only the URL is normalised -- `Lk.` to
Luke, `Psalm` to Psalms, and his `ff` or trailing verse letters dropped,
since BibleGateway cannot parse them.

Two kinds of reference are deliberately left as plain text rather than
guessed at: `Peter 1:6-7` on 2026-07-07, which is missing its book number,
and `Psalms 119: (18)`, whose shape is too irregular to parse.

`/scripture/` lists all every reference in canonical order, Genesis to
Revelation, each linking to the devo that quotes it -- or to each of them,
for the 40 verses cited more than once. It is linked from the home page
only. The page is built by `src/_data/scripture.js`, which reads the
Markdown directly rather than going through collections so it does not
depend on every devo having rendered first.

Both the linker and the index import their parsing rules from
`lib/scripture.js`. That is the whole reason the file exists: if they
drifted, the index would list verses the pages do not link, or the reverse.

## Activity graph

The home page opens with a calendar of the days he sent a devo: a row per
month, a column per day of the month. Selecting a day clears any active
filter and scrolls the list to that day, flashing the row so the eye lands
in the right place. Empty days are not interactive, and every day he sent
one is the same blue whatever the count -- the date and count are in each
square's tooltip and accessible name.

The first version copied GitHub's layout, a column per week across the
year. That shape assumes a wide page: 43 columns did not fit this site's
408px list column, so it needed horizontal scrolling and pinned day labels.
Months-as-rows is at most 31 columns, so `grid-template-columns:
repeat(31, 1fr)` makes it fit by construction at any width.

A back-to-top button appears bottom right once the page is scrolled past
320px, on the home page only.

## Deploying

`_site/` is a plain static directory, so any static host will serve it --
Netlify, Cloudflare Pages, GitHub Pages or Firebase.

`firebase.json` ships with **no `site` pinned**, deliberately. Firebase
projects can hold several hosting sites, and a stale site id in this file
would let a deploy overwrite the wrong one. Add yours before the first
deploy:

```json
{ "hosting": { "site": "your-site-id", "public": "_site" } }
```

Set `url` in `src/_data/site.json` to the live origin at the same time; the
canonical and `og:` tags stay off until it has a value, since link previews
need absolute URLs.

## Things worth knowing

- **`devos` is still the internal name** for posts -- the directory, the
  collection and the layout. Renaming it to `posts` touches
  `src/devos/`, `devos.json`, the `collections.devos` references in
  `index.njk` and `scripture.njk`, and the permalink.
- **Scripture linking is specific to devotional writing.** If this becomes a
  general blog, `lib/scripture.js`, `src/_data/scripture.js`,
  `src/scripture.njk` and the `scriptureLinks` transform can all come out
  without touching anything else.
- **The avatars are placeholders.** `src/assets/img/avatar.svg` and
  `cluster.svg` are neutral figures, not pictures of anyone. Replace them
  with real images when the site has an actual author.
