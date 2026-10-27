---
title: "A Photo"
date: 2026-09-30
time: 8:20 AM
summary: "Sample content. A picture sent as its own message, the way an image arrives in a thread."
---
Sample body text. A picture is sent the way any other message is -- put it in the post and it arrives as its own bubble.

***

<img src="/assets/img/sample-photo.jpg" alt="A stylised sunrise over low hills" width="900" height="600">

***

A picture sent on its own fills the bubble edge to edge, with no padding around it. One that shares a bubble with text keeps the usual padding instead:

![A stylised sunrise over low hills](/assets/img/sample-photo.jpg)

Both forms work. The plain Markdown `![alt](src)` above is the quicker one to write; the `<img>` tag in the middle bubble is worth the extra typing for anything above the fold, because the `width` and `height` let the browser hold the right amount of space and the thread does not jump as the picture loads.

Keep the `alt` text meaningful either way -- it is what a screen reader announces, and what shows if the file ever goes missing.
