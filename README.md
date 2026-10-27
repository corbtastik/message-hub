# Message Hub

A small blog framework that renders posts as an iOS Messages thread.

Each post is a message in a conversation: a bubble with a timestamp, a sender
and an avatar. The home page is the conversation list, with search and a
calendar of posting activity.

Built with [Eleventy](https://www.11ty.dev/). Posts are Markdown files with
front matter; everything else is generated.

## Running it

```sh
npm install
npm start     # http://localhost:8080
npm run build # writes the static site to _site/
```

## Adding a post

Copy [`docs/TEMPLATE.md`](docs/TEMPLATE.md) into `src/posts/` and name it
`YYYY-MM-DD-short-slug.md`. The date prefix is stripped from the URL.

```
---
title: "Short Title"
date: 2026-09-01
time: 6:40 AM
author: "Someone Else"    # optional; omit it and site.author is used
summary: "One line, used for the list preview."
---
Body in Markdown.
```

A picture or a video sent on its own fills the bubble the way Messages draws
one; audio keeps the bubble's padding. Any other file attaches as a document
row with `{% attachment "/assets/files/x.pdf" %}`. See `docs/TEMPLATE.md`.

## Sample content

`src/posts/` ships with **24 sample posts**, all invented placeholder text.
They exist to make the site render and to exercise every feature: headings
and code spans, flat and nested lists, blockquotes, the curly quotes and
dashes the build applies, a post split into two bubbles, a picture, a video
clip, an audio clip, a PDF attachment, a second author with the fallback avatar, an afternoon post, two posts
on one day, a deliberate gap in the calendar, and an external link. Delete
them and write your own.

The placeholder media in `src/assets/` goes with them: `sample-photo.jpg`,
`sample-video.mp4` with its poster frame, `sample-audio.mp3` and
`sample-document.pdf` are all generated -- drawn, synthesised and typeset by
the build, not recorded or photographed.

## Configuring

`src/_data/site.json` holds the title, author, description and public URL.
Set `url` before deploying -- the canonical and `og:` tags are only emitted
once it has a value.

## More

[`docs/FRAMEWORK.md`](docs/FRAMEWORK.md) covers the layout, searching,
theming and deployment.
