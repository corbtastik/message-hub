---
title: "An Audio Clip"
date: 2026-10-02
time: 9:12 AM
summary: "Sample content. A sound file in a message, played by the browser's own control."
---
Sample body text. A sound file goes in the same way a picture or a video does.

***

<audio src="/assets/audio/sample-audio.mp3" controls preload="metadata"></audio>

***

Audio is the one attachment that keeps the bubble's padding. A picture has proportions of its own, so it can fill the bubble edge to edge and look deliberate; a player is a fixed-height bar with its own rounded fill, and pushed flush to the bubble's edge it reads as a mistake rather than a decision.

`preload="metadata"` earns its place here. Without it the browser cannot show a duration until it has started fetching the file, so the control sits there claiming `0:00` until someone presses play.

The control draws itself in whichever light or dark style the page asks for through `color-scheme`, which the theme sets -- so it flips with the toggle in the header instead of staying light on a dark thread.

What this is *not* is a voice message. The scrubbable waveform iOS draws needs a custom player and the samples to draw it from; this is the control the browser gives you for nothing, and it works.
