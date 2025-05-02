---
title: Download YouTube Videos
author: Tristan Madden
categories: [Shell]
tags: [download, youtube-dl, yt-dlp]
date: 2022-04-16
lastmod: 2023-03-03
thumbnail: "thumbnail.png"
usePageBundles: true
---


<h2>yt-dlp</h2>
yt-dlp is a free and open-source command-line tool for downloading videos and audio from YouTube and other video hosting sites. It is a fork of youtube-dl with additional features and improvements, including better performance and more frequent updates. Unlike youtube-dl, which has faced various legal challenges and takedowns, yt-dlp is actively maintained and regularly updated to ensure compatibility with the latest changes in video hosting sites.
<h3><a href="https://github.com/yt-dlp/yt-dlp">GitHub Repository</a> </h3>
<h3><a href="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe">Download the Windows executable</a></h3>

_Download a YouTube video with default settings:_
```CMD
yt-dlp "https://www.youtube.com/watch?v=oHg5SJYRHA0"
```
_Extract audio from a video:_
```
yt-dlp --extract-audio "https://www.youtube.com/watch?v=oHg5SJYRHA0"
```
_Specify audio format and audio quality of extracted audio (between 0 (best) and 10 (worst), default = 5):_
```CMD
yt-dlp --extract-audio --audio-format mp3 --audio-quality 0 "https://www.youtube.com/watch?v=oHg5SJYRHA0"
```
_Download all playlists of YouTube channel/user keeping each playlist in separate directory:_
```CMD
yt-dlp -o "%(uploader)s/%(playlist)s/%(playlist_index)s - %(title)s.%(ext)s" "https://www.youtube.com/user/TheLinuxFoundation/playlists"
```
<h2>youtube-dl</h2>
Youtube-dl is a free, open-source command-line program that allows users to download videos and audio from various websites, including YouTube, Vimeo, and SoundCloud. It is available for Windows, macOS, and Linux operating systems. The program supports a wide range of formats, including MP4, WebM, and MP3, and can be customized with various options and parameters.
<h3><a href="https://github.com/ytdl-org/youtube-dl">GitHub Repository</a> </h3>
<h3><a href="https://yt-dl.org/latest/youtube-dl.exe">Download the Windows executable</a></h3>

Download a YouTube video with default settings:

```CMD
youtube-dl "https://www.youtube.com/watch?v=oHg5SJYRHA0"
```

Download a YouTube video with the best available audio quality:

```CMD
youtube-dl -f bestaudio "https://www.youtube.com/watch?v=oHg5SJYRHA0"
```

Download an entire YouTube playlist:

```CMD
youtube-dl --yes-playlist "https://www.youtube.com/playlist?list=PLG49S3nxzAnmpdmX7RoTOyuNJQAb-r-gd"
```

Begin downloading from a playlist at a specific position:

```CMD
youtube-dl --yes-playlist --playlist-start 22 "https://www.youtube.com/watch?v=M5c9HdaQqh0&list=PLG49S3nxzAnmpdmX7RoTOyuNJQAb-r-gd"
```