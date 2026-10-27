---
title: "An Attachment"
date: 2026-10-05
time: 10:40 AM
summary: "Sample content. A PDF attached to a message, shown as a document row."
---
Sample body text. Some files have no sensible way to be shown inline at a bubble's width. A PDF is the obvious one: there is nothing useful to render in 310 points, so it arrives as a row instead.

***

{% attachment "/assets/files/sample-document.pdf" %}

***

The row is a shortcode rather than a pasted block of markup, because an attachment needs an icon, a name, a type, a page count and a size, and none of that is worth typing by hand:

```
{% raw %}{% attachment "/assets/files/sample-document.pdf" %}
{% attachment "/assets/files/sample-document.pdf", "Trip notes" %}{% endraw %}
```

The second argument renames the row without renaming the file.

Everything to the right of the name is read off the file itself at build time -- the type from the extension, the size from the bytes, the page count out of the PDF. None of it is typed into the post, so none of it can drift from the file actually being served. Swap the PDF for a longer one and the row says so on the next build.

A path that points at nothing fails the build rather than shipping a dead link, which is the behaviour you want the one time you rename a file and forget the post that referenced it.

Page counting reads the raw bytes, so it works on a plain PDF and gives up on one that keeps its page tree in a compressed object stream. When it gives up the row simply leaves the count out rather than guessing at it.
