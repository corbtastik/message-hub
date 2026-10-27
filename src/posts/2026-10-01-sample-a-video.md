---
title: "A Video"
date: 2026-10-01
time: 7:05 AM
summary: "Sample content. A short clip sent as its own message, with a poster frame and controls."
---
Sample body text. A clip is sent the same way a picture is, and it gets the same bubble treatment -- on its own it fills the bubble edge to edge.

***

<video src="/assets/video/sample-video.mp4" poster="/assets/video/sample-video-poster.jpg" width="600" height="400" controls preload="metadata" playsinline></video>

***

Four attributes are worth setting on the tag, and the defaults are wrong for a thread without them.

`poster` gives the bubble something to show before anyone presses play. Without it the browser has to start fetching the clip just to find a first frame, so the bubble sits empty until it does.

`preload="metadata"` fetches the dimensions and duration but not the clip itself. A thread of videos would otherwise pull megabytes on load for something nobody has asked to watch yet.

`playsinline` keeps iOS from throwing the video fullscreen the moment it starts, which is the one that looks most broken if you forget it.

`width` and `height` do the same job they do on a picture: they reserve the right shape so the thread does not jump as the file arrives.
