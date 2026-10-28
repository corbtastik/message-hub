# Message Hub — framework notes

How the pieces fit together. For getting started, see the
[README](../README.md).

## Layout

```
src/
  index.njk            conversation list (home)
  index.11tydata.js    pagination settings for it
  tags.njk             one page per tag
  tags-index.njk       /tags/, every tag with its count
  _data/activity.js    builds the calendar grid for the activity graph
  _data/palettes.json  the colour palettes, seven source colours each
  _data/site.json      title, author, description, url
  _includes/
    base.njk           <head>, meta and social tags
    post.njk           the Messages thread
    row.njk            one conversation-list row, shared by both lists
    controls.njk       appearance + palette buttons, used by both
  assets/css/app.css   all styles
  assets/js/search.js  list filtering, typed dates, sort, arrow keys
  assets/js/theme.js   the appearance toggle
  assets/js/palette.js the palette picker
  assets/img/          site icon and sample photo
  assets/img/people/   author portraits, one SVG per name
  assets/video/        sample clip and its poster frame
  assets/audio/        sample sound file
  assets/files/        sample attachment (PDF)
  posts/
    posts.json         layout, tag and permalink for every post
    *.md               one file per post (50 samples ship with it)
docs/TEMPLATE.md       starting point for a new post
docs/FRAMEWORK.md      this file
lib/palette.js         palette colours -> CSS tokens; used by the build
tools/make-avatar.js   draws an author portrait; not part of the build
firebase.json          hosting config (no site pinned - see Deploying)
```

`posts.json` is Eleventy's directory data file, so **its name has to match
the folder's**. Renaming `src/posts/` means renaming that file too.

## Searching the list

The home page filters client-side as you type. Dates go in the same box as the
text -- there is no date picker:

| Typed                      | Against the shipped samples             |
| -------------------------- | --------------------------------------- |
| `bubble`                   | 12 posts containing the word            |
| `bubble quotation`         | the 2 containing *both* words           |
| `9/21/26`                  | that single day                         |
| `9/1/26 to 9/15/26`        | that range, inclusive                   |
| `list 9/1/26 to 9/15/26`   | text and range together                 |

`to`, `-`, `–`, `..` and `through` all work as range separators, as does
writing two dates side by side. A reversed range is read the same as a forward
one. A string that looks like a date but is not one (`2/31/26`) stays a plain
text term rather than silently filtering. The result line echoes the dates it
understood, so a mistyped filter is visible. The one button reverses the sort.

From the search box, Down jumps to the top match and Down/Up walk the
matches in the order shown (so it follows the sort); Up from the top match
returns to the box, Enter opens the post, Escape clears the search.

Each row carries its searchable text in a `data-text` attribute, so the index
is the page itself -- no extra request, and the list still renders unfiltered
with JavaScript off. Across the 50 samples that index is about 23 KB of a
97 KB page, roughly 450 bytes a post; longer posts cost proportionally more.

**Searching and sorting only see the current page.** They work on the rows in
the document, and pagination is what decides which rows those are. With the
default 50 a post at 51 is on page two and a search from page one will not
find it. At the shipped 50 posts there is exactly one page, so this does not
bite yet -- it starts the day the archive outgrows a page.

## Pagination

The conversation list is paginated at `site.perPage`, 50 by default. Page one
keeps the bare `/` so the front door never becomes `/page/1/`; the rest are
`/page/2/`, `/page/3/` and so on. Below a full page the navigation does not
render at all, which is the state the shipped samples are in.

The settings live in `src/index.11tydata.js` rather than index.njk's front
matter, because front matter is static YAML and cannot read `site.perPage`
from the site data.

The byline counts the whole archive, not the page -- `collections.posts`
rather than the paginated slice -- so "50 posts from ..." stays true on every
page.

### What pagination had to be told about

**The activity graph spans the whole archive** while a page holds one slice of
it, so a day cell has to know where its posts went. The `pageForDate` filter
works that out at build time and each cell carries a `data-page`; clicking a
day on another page is a navigation to `/page/N/#d<date>` rather than a
scroll, and the arriving page flashes the row from the hash. Without that,
clicking an older date would scroll to a row that is not in the document and
nothing would happen.

**The back-to-top button is fixed to the bottom-right corner**, which is
exactly where "Older" lands. They overlap at phone widths at the end of the
page, so `.pagenav` carries a bottom margin to clear it. That margin is
load-bearing, not decoration.

**The result count says "on this page"** once there is more than one, since
"Showing 3 of 50" would otherwise read as 3 of the archive.

## Tags

A post takes them in front matter:

```yaml
tags: [cooking, winter]
```

They render as chips under the last bubble, each linking to `/tags/<tag>/`,
and `/tags/` lists every tag with its count, commonest first. A single-row
card between the activity graph and the search toolbar links to that index
and shows how many tags there are -- `.index-link`, carried over from the
project this was ported from, where it pointed at a scripture index. Unlike
the graph and the toolbar it is not hidden until the scripts run, because it
is a plain link and works without them; it renders only when something is
actually tagged. They also join
the row's searchable text, so typing a tag in the list box filters by it even
though the rows themselves do not show tags -- a chip on every row would
crowd out the preview.

### The thing to know

**`tags` is also how a post joins a collection.** `src/posts/posts.json` sets
`tags: "posts"` on the whole directory, which is what builds
`collections.posts` -- the thing the index, the pagination and the pager all
read. A post that declares its own `tags` therefore looks like it should
replace that and drop itself out of the site.

It does not. Eleventy 3 deep-merges the two, so front matter `tags: [garden]`
comes out as `[posts, garden]`: the post stays in `collections.posts` and
also gets a `garden` collection for free. That was verified rather than
assumed -- it is the kind of thing that would quietly remove posts from the
list.

The cost is that `posts` rides along in every post's tag list, so anything a
reader sees has to filter it out. That is the `userTags` filter, and
`STRUCTURAL_TAGS` in `eleventy.config.js` is the list it strips. Add another
directory-level tag and it belongs in that list too, or it will show up as a
chip and get a page of its own.

## Authors and avatars

Every name resolves the same way, the site author included, through the
`avatar` filter, which looks for
`src/assets/img/people/<slug>.svg`, the slug being the name lowercased with
runs of non-alphanumerics collapsed to hyphens. If the file is there it is
used; if not the template falls back to a neutral figure drawn inline.

That means adding a contributor is adding a file named after them. There is
no register to update, and a name with no portrait degrades to the fallback
rather than a broken image. Nothing in the shipped samples exercises that
fallback now: the one post that did has been removed, so the branch is live
but untested by content. Give any post an `author` with no matching file to
see it.

`tools/make-avatar.js` draws the portraits, wired up as `npm run avatar --
"Their Name"`. It is not part of the build and never runs during one; it is a
one-off for a new author, and its output is committed. Faces are derived from a hash of the name, so a person keeps the
same one across rebuilds, and a given name always produces the same file.

Two constraints shaped the drawing, both from the 32px size on a thread page:
hair is clipped above the eyeline so a big style cannot swallow the face, and
the eyes carry a white sclera so they stay legible on the darker skin tones.
The first version failed both and had to be redone.

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
  light-mode dots on black;
- they must declare the same token *names* as `:root` -- renaming a token in
  `:root` while both dark blocks kept the old name left them agreeing with
  each other and silently falling back to the light value.

Neither failed visibly, which is the reason the check exists. Keep all light
tokens in the single `:root` block; a second one would hide from the check. Forcing a theme
also sets `color-scheme`, without which the browser keeps painting native
controls and scrollbars for the system appearance.

## Colour palettes

29 palettes, ported from
[yolo-11ty](https://github.com/corbtastik/yolo-11ty)'s `themes.json`: the
whole "Corbs Themes" group, plus Material Gray, Material Blue Gray and
Material Light Blue from "Material Themes". The palette button sits under the
appearance toggle and opens a grid of swatches; the first clears back to the
default.

Those last three are there to square off the grid. 29 palettes plus the
default is 30 swatches, which is exactly five rows of six -- 26 left a row
three short.

**Palette and appearance are independent axes.** Each palette carries a light
and a dark side, and every generated value is a `light-dark()` pair, so the
browser picks the side matching `color-scheme` -- which app.css already sets
for both the system preference and the manual toggle. Nothing in the palette
code knows which mode is showing, and switching appearance needs no
re-application.

Applying one is setting `data-palette` on `<html>`. That is all `palette.js`
does. The inline script in `<head>` sets it from `localStorage` before first
paint, the same way the appearance override is applied, so there is no flash.

### Where the colours come from

`src/_data/palettes.json` holds seven source colours per palette per mode --
`bg`, `text`, `heading`, `link`, `primary`, `surface`, `border`. The upstream
data also carries five syntax-highlighting colours; this project has no syntax
highlighting, so they are dropped on the way in. They are recoverable from
yolo-11ty if that ever changes.

`lib/palette.js` maps those seven onto the twenty tokens `:root` declares, and
`eleventy.config.js` writes one rule per palette into
`assets/css/palettes.css` at build time. The alpha-derived tokens -- `--sep`,
`--control`, `--hover`, `--day-off` and friends -- are ink over the
background: app.css hard-codes black-at-low-alpha for light and
white-at-low-alpha for dark, which generalises to `text` at that alpha and so
works for any palette.

There is deliberately **one** copy of that mapping. The project it came from
had two, one in the build and one in the browser, and they drifted: the
browser's covered 34 of 90 variables, so switching themes left most of the
page on the compiled-in theme. Here the browser has no copy at all.

### A note on contrast

`--meta` -- timestamps, list previews, the sender name -- is muted by design,
the way iOS mutes secondary text, and it is derived by mixing `text` 45% of
the way toward `bg`. Across the 29 palettes that lands most light modes
somewhere between 2.5 and 4.0 against the background.

That is not something the palettes introduced: the default theme's own light
mode is 3.26, and 34 of the 52 existing palette/mode pairs were already under
4.5 before the Material three were added. If secondary text ever needs to
clear 4.5 everywhere, the lever is the 0.45 mix factor in `lib/palette.js`
and the hard-coded `--meta` in app.css -- both, or they will disagree.

### The guard

`assertPaletteCoversTokens()` fails the build when `lib/palette.js` and
`:root` disagree in either direction, or when a token is mapped twice. A
palette overrides every colour at once; one it misses stays at the default --
a white bubble on a dark palette -- and nothing errors, it just looks broken
on every page. Same reasoning as `assertDarkThemesMatch()`, which is why they
sit next to each other.

Adding a token to `:root` without adding it to the mapping now fails the
build, and so does the reverse.

### Cost

`palettes.css` is about 28 KB, around 5 KB gzipped, and is loaded on every page
whether or not anyone opens the picker. That is the price of having the
palettes be plain CSS rather than something JavaScript assembles, which is
what buys the no-flash restore and keeps the browser free of the mapping. If
that ever looks like a bad trade, the lever is trimming the palette list, not
moving the work back into JavaScript.

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

## External links

A build-time transform in `eleventy.config.js` gives every off-site link
`target="_blank"` and `rel="noopener"`. A post is read the way a text message
is, so a tapped link should open alongside the thread rather than replace it.
It leaves any link that already carries a `target` alone.

## Emoji

Posts carry emoji as plain Unicode. There is no image set and no shortcode:
on an Apple device the system draws them in Apple Color Emoji, which is the
look these were chosen against, and elsewhere the platform's own set stands
in. Apple's emoji font cannot be web-embedded any more than SF Pro can, so
this is the same bargain the typography section describes.

`--sf` names `Apple Color Emoji`, `Segoe UI Emoji` and `Noto Color Emoji`
ahead of the generic `sans-serif`, because `Inter` carries no emoji glyphs
and the fallback should be a colour set rather than whatever the generic
family resolves to.

The conversation-list preview truncates on **grapheme clusters**, not UTF-16
units. Cutting a string at a fixed length mid-emoji leaves a lone surrogate,
which draws as a replacement character, and cutting a ZWJ sequence or a
skin-tone modifier turns one glyph into two. `Intl.Segmenter` in the
`preview` filter handles both. This only bites a post with no `summary`,
since a summary is almost always under the limit -- but that is a documented
way to write a post, so it is reachable.

## Code blocks

A fenced block gets `overflow-x:auto`. Without it one long line pushes the
whole document wider than the viewport, and the reader gets a horizontal
scrollbar on the page instead of on the block, which also breaks the thread's
centring. There is not much room to play with: a 334px bubble leaves 282px
inside the block, which is about thirty-six monospace characters. Inline
`code` keeps the bubble's `overflow-wrap`, so a long attribute breaks rather
than doing the same thing.

The monospace stack is `--mono`, beside `--sf`. Both are exempt in
`assertDarkThemesMatch()` from needing a dark counterpart, since a font stack
is not a themed value.

## Pictures, video, audio and attachments

A picture or a clip goes in the post body as an ordinary tag, and the bubble
does the rest:

```html
<img src="/assets/img/sample-photo.jpg" alt="..." width="900" height="600">
<video src="/assets/video/sample-video.mp4" poster="..." width="600"
       height="400" controls preload="metadata" playsinline></video>
<audio src="/assets/audio/sample-audio.mp3" controls preload="metadata"></audio>
```

A picture or a video sent on its own fills the bubble edge to edge with the
bubble's own corner radius -- the media *is* the bubble, the way Messages
draws one. Sharing a bubble with text, it keeps the usual padding and a
smaller radius. The rule that tells them apart is a `:has()` test for a lone
`img` or `video`; a browser without `:has()` just keeps the padded bubble, so
nothing breaks.

**Audio is deliberately left out of that rule** and always keeps the padding.
A picture has proportions of its own, so filling the bubble looks intended; a
player is a fixed-height bar carrying its own rounded fill, and flush to the
bubble's edge it reads as a bug. The control also draws itself in the light
or dark style `color-scheme` asks for, which the theme sets in both the
forced blocks -- so it flips with the appearance toggle rather than sitting
light on a dark thread. A scrubbable waveform like the one iOS draws for a
voice message is a custom player, not this tag.

Two shapes have to be matched, because markdown-it treats the two tags
differently: `![alt](src)` and a hand-written `<video>` both come out wrapped
in a paragraph, while a hand-written `<img>` on its own line is left as a bare
child of the bubble.

Markdown's `![alt](src)` is quicker to write, but it cannot carry `width` and
`height`, so the thread reflows as the picture loads. Write the tag by hand
for anything above the fold. On a `<video>`, set `poster` (or the bubble is
empty until playback starts), `preload="metadata"` (or a thread of clips
pulls megabytes nobody asked for) and `playsinline` (or iOS goes fullscreen
on play).

### Attachments

A file with nothing useful to show inline at 334 points -- a PDF, a zip --
goes in as a document row instead, through a shortcode:

```njk
{% attachment "/assets/files/sample-document.pdf" %}
{% attachment "/assets/files/sample-document.pdf", "Trip notes" %}
```

It is a shortcode rather than markup to paste because the row carries an
icon, a name, a type, a page count and a size, and because everything after
the name is read off the file itself at build time: the type from the
extension, the size from the bytes, the page count out of the PDF. None of
it is written into the post, so none of it can drift from the file being
served. A path that resolves to nothing throws and fails the build, rather
than shipping a dead link.

Page counting reads the raw PDF bytes -- `/Type /Page` objects, falling back
to the largest `/Count` -- so it works on a plain file and returns nothing
for one that keeps its page tree in a compressed object stream. When it
returns nothing the row leaves the count out instead of guessing.

Like a picture, a row alone in a bubble fills it; it is folded into the same
`:has()` rule. `a.attach` has to outrank `.bubble a`, or the generic link
style would make the row blue and underlined.

### Caching

`firebase.json` caches `/assets/img/**`, `/assets/video/**`,
`/assets/audio/**` and `/assets/files/**` for a year as immutable, so
changing a file means changing its name. The rules are deliberately separate
rather than one `@(img|video|audio|files)` glob: the extglob syntax is used
elsewhere in that file for extensions, but a path-segment version of it
cannot be checked without a deploy.

## Activity graph

**Experimental on this branch.** There are two components over the same data,
chosen by `site.activityStyle`:

| | `calendar` | `pulse` |
| --- | --- | --- |
| shape | a row per month, a column per day | one bar per month, twelve a year |
| answers | did anything happen on the 14th | which months were busy |
| height | ten rows, ~145px | one band, ~58px |
| jumps to | that day | that month's first post |

They are `_includes/activity-calendar.njk` and `_includes/activity-pulse.njk`,
and both render as `#activity` with `data-day` on each target, so `search.js`
wires up jumping without knowing which is on -- it matches the attribute
rather than a class.

The calendar deliberately uses one fill whatever the count, which means it
cannot show that September holds twenty posts and April three. The pulse is
the opposite trade: volume at a glance, no day-level detail. Neither is
strictly better; the pulse is here to be looked at.

The pulse draws whole calendar years, not just the months with posts, so it
is always twelve bars wide and January does not shift along as the year fills
in. That is `activity.yearMonths`, padded from the same data; the calendar
keeps the unpadded `activity.months`, where an empty month would only be a
wasted row. A multi-year archive gives it twelve bars per year, which gets
tight past two.

Three things it needed that are not obvious. Its bars sit on a baseline
rather than in filled tracks, because with tracks the quiet months read as
empty boxes instead of short bars. A month with no posts is rendered as an
inert `span` with no fill element rather than a button -- the same rule the
calendar uses for empty days, and it also stops the minimum bar height, which
keeps a one-post month visible, from drawing a bar for an empty one. And the
month labels use the full short name: truncating to two characters made
Mar/May and Jun/Jul identical.

### The calendar

The home page opens with a calendar of the days a post went out: a row per
month, a column per day of the month. Selecting a day clears any active
filter and scrolls the list to that day, flashing the row so the eye lands
in the right place. Empty days are not interactive, and every day with a
post is the same blue whatever the count -- the date and count are in each
dot's tooltip and accessible name.

The first version copied GitHub's layout, a column per week across the
year. That shape assumes a wide page: 43 columns did not fit this site's
440px list column, so it needed horizontal scrolling and pinned day labels.
Months-as-rows is at most 31 columns, so `grid-template-columns:
repeat(31, 1fr)` makes it fit by construction at any width.

`src/_data/activity.js` reads the post *filenames* rather than their
contents -- the `YYYY-MM-DD` prefix is all it needs -- so it stays cheap as
the archive grows.

A back-to-top button appears bottom right once the page is scrolled past
320px, on the home page only.

## Deploying

It is on Firebase at **https://message-hub.web.app**, in the `corbs-cloud`
project:

```sh
npm run build
firebase deploy --only hosting
```

Both the project and the site are pinned -- the project in `.firebaserc`, the
site as `hosting.site` in `firebase.json` -- and that is not tidiness. That
project holds several hosting sites, and with nothing pinned a deploy falls
back to the site named after the project, so `firebase deploy` would have
published this over `corbs-cloud`. Pinning both makes the target explicit
rather than inherited.

`url` in `src/_data/site.json` is the live origin. The canonical and `og:`
tags stay off until it has a value, since link previews need absolute URLs,
so it has to match wherever the site actually lands.

Moving it elsewhere means changing all three together: the site id, the
project, and that url. `_site/` is a plain static directory, so any static
host will serve it -- Netlify, Cloudflare Pages and GitHub Pages all work the
same way, minus the `firebase.json` cache headers, which would need
re-expressing in whatever that host uses.

## Things worth knowing

- **Nothing here is a photograph of anyone.** Every face is a drawing,
  the site author's included.
- **A thread's top bar is one row**: back button, the conversation pill, and
  the appearance toggle, all centred on the same line. It used to carry a
  group icon above the pill, which is why `.screen` had 99px of top padding;
  that is now 68px and the bar 76px.
- **The bar's height and that padding are a pair.** The gradient is
  black-on-black, so it is invisible against the background but dims any text
  under it, and what matters is how far down the gradient the first line of
  content lands. At 76/68 the date stamp sits under about 0.19 alpha while
  the bottom of the back button is still under 0.76. Changing one number
  without the other is how the stamp ends up washed out -- which it was, at
  0.80, when the bar was first shortened.
- **The tab icon follows `site.author`**, resolved through the same `avatar`
  filter rather than hard-coded, so renaming the author moves it with no edit
  to `base.njk`.
- **`icon.png` is the one raster.** `apple-touch-icon` has to be a PNG and
  `og:image` has to be something social scrapers will render, so neither can
  take the SVG. It is a 512px square rasterised from the author's portrait,
  with the portrait's own background filling the corners -- a transparent PNG
  would be composited onto black by iOS. Regenerate it after changing the
  portrait: render `people/<slug>.svg` at 512px over that background and save
  it as `src/assets/img/icon.png`. It is the only thing in here that has to
  be kept in step by hand.
- **`time` is free text**, shown exactly as written. It is not parsed, so
  `6:40 AM`, `14:15` or `just after lunch` all render.
- **Two posts can share a date.** The list shows them together, the pager
  walks both, and the activity graph counts the day twice.
