
---
author: Tristan Madden
categories: [Microsoft Teams]
date: 2025-07-02
draft: false
tags: [ffmpeg, yt-dlp]
title: Videos as Teams Backgrounds
summary: "How to turn any YouTube video into your Microsoft Teams background."
usePageBundles: true
---

First, start by installing yt-dlp to download the YouTube video: [https://github.com/yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp)

Secondly, install ffmpeg because you'll need to re-encode the video to `libx264`: [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html)

Next, find a YouTube video and download only the first 30 minutes of it at 720p resolution with no audio using yt-dlp:

```cmd
yt-dlp -f "bestvideo[height=720]" --download-sections "*00:00:00-00:30:00" https://www.youtube.com/watch?v=lWLUJHtlYyM
```

Microsoft Teams backgrounds are stored in the following `%localappdata%` path:

```cmd
C:\Users\<username>\AppData\Local\Packages\MSTeams_8wekyb3d8bbwe\LocalCache\Microsoft\MSTeams\Backgrounds
```

The Teams UI will not detect your new video if you simply drop it into this directory. You must rename it to match one of the four existing `.mp4` files:

`feelingDreamy2Animated_v=0.1.mp4`

`feelingDreamy4Animated_v=0.1.mp4`

`feelingDreamy5Animated_v=0.2.mp4`

`feelingDreamy7Animated_v=0.1.mp4`


After renaming, you need to re-encode it to `libx264` using ffmpeg:

```cmd
ffmpeg -i feelingDreamy4Animated_v=0.1.mp4 -c:v libx264 -crf 23 -preset medium -c:a copy feelingDreamy4Animated_v=0.1.mp4
```

Once the video has been renamed and re-encoded, it should appear and work as a selectable background in Microsoft Teams.
