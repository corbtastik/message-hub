# Message Hub

A small blog framework that renders posts as an iOS Messages thread. Each post
is a message in a conversation; the home page is the conversation list.

Built with [Eleventy](https://www.11ty.dev/).

## Running it

```sh
npm install
npm start      # http://localhost:8080
npm run build  # writes the static site to _site/
```

## Adding a post

Drop a Markdown file in `src/posts/` named `YYYY-MM-DD-short-slug.md`. The date
prefix is stripped from the URL.

```
---
title: "Short Title"
date: 2026-09-01
time: 6:40 AM
summary: "One line, used for the list preview."
---
Body in Markdown.
```

Only `title` and `date` are required. See
[`docs/TEMPLATE.md`](docs/TEMPLATE.md) for the rest, including pictures, video,
audio and attachments.

## Sample content

50 sample posts ship in `src/posts/`, all invented, along with the placeholder
images, media and author portraits they use. Delete them and write your own.

## More

[`docs/FRAMEWORK.md`](docs/FRAMEWORK.md) covers how it all fits together --
search, theming, colour palettes, authors and deployment.
