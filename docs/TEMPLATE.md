---
# Copy this file into src/posts/ and name it YYYY-MM-DD-short-slug.md
# The date prefix is stripped from the URL: /posts/short-slug/
title: Short Title Shown In The List
date: 2025-10-27
time: 9:08 AM
# author: Someone Else      # optional; omit it and site.author is used
summary: >                     # optional; used for the link preview when texted
  One or two sentences describing this post.
---
Write the post in Markdown. Blank lines separate paragraphs.

- Bullet lists work
- Use them for the point-by-point sections

Quote something with a blockquote:

> Whatever you can do, or dream you can, begin it. Boldness has genius,
> power and magic in it.

To break a long post into several message bubbles — the way a long text
arrives as a few messages in a row — separate the chunks with `***` on its
own line:

***

This paragraph lands in a second bubble. Only the last bubble gets the
tail and the avatar, which is how iOS renders a run of messages.

***

<img src="/assets/img/sample-photo.jpg" alt="Describe the picture" width="900" height="600">

***

A picture or a clip alone in a bubble fills it edge to edge. Give the tag a
`width` and `height` so the thread does not jump as the file loads, and a
real `alt`. For video, add `poster`, `preload="metadata"` and `playsinline`:

<video src="/assets/video/sample-video.mp4" poster="/assets/video/sample-video-poster.jpg" width="600" height="400" controls preload="metadata" playsinline></video>
