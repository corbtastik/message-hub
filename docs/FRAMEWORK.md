# Message Hub — framework notes

How the pieces fit together. For getting started, see the
[README](../README.md).

## Layout

```
src/
  index.njk            conversation list (home)
  _data/activity.js    builds the calendar grid for the activity graph
  _data/site.json      title, author, description, url
  _includes/
    base.njk           <head>, meta and social tags
    post.njk           the Messages thread
    theme-toggle.njk   the appearance button, used by both
  assets/css/app.css   all styles
  assets/js/search.js  list filtering, typed dates, sort, arrow keys
  assets/js/theme.js   the appearance toggle
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
97 KB page -- roughly 450 bytes a post; longer posts cost proportionally more, and past roughly 300 posts
it would be worth moving it to a separate fetched `search.json`.

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
