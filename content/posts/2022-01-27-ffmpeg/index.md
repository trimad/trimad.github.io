---
author: Tristan Madden
categories: ["PowerShell", "CMD"]
date: 2022-01-27
draft: false
summary: "A comprehensive reference guide to FFmpeg commands and filters, covering audio/video processing, screen recording, format conversion, and advanced filtering techniques with detailed parameter explanations and practical examples."
tags: ["audio", "video", "shell", "ffmpeg"]
title: "FFmpeg Command Reference"
toc: true
usePageBundles: true
---

FFmpeg is a complete, cross-platform solution to record, convert, and stream audio and video.

## Downloads and docs

- [FFmpeg Windows builds](https://www.ffmpeg.org/download.html#build-windows)
- [FFmpeg documentation (ffmpeg)](https://ffmpeg.org/ffmpeg.html)

## Audio processing

### Convert to 8 kHz, mono PCM (WAV)

```shell
ffmpeg -i "input.mp3" -ar 8000 -ac 1 output.wav
```

### Convert to 16 kHz, mono PCM (WAV)

```shell
ffmpeg -i "input.mp3" -ar 16000 -ac 1 output.wav
```

### Convert to 48 kHz, mono PCM (WAV)

```shell
ffmpeg -i "input.mp3" -ar 48000 -ac 1 output.wav
```

## Video processing

### Add music to a video (no re-encode)

```shell
ffmpeg -i "video.mp4" -i "music.mp3" -codec copy -shortest output.mp4
```

-i video.mp4  
: Select `video.mp4` as an input file (same directory unless you provide a path).

-i music.mp3  
: Select `music.mp3` as an input file.

-codec copy  
: Copy streams without re-encoding.

-shortest  
: Stop the output when the shortest input ends (useful when audio is longer than video).

### Assemble images into a video

```shell
ffmpeg -framerate 60 -s 2560x1440 -i %04d.png output.mp4
```

-framerate 60  
: Set the frame rate to 60 FPS.

-s 2560x1440  
: Set the output resolution.

-i %04d.png  
: Read an image sequence named like `0001.png`, `0002.png`, etc.

Start from a specific frame number:

```shell
ffmpeg -start_number 140 -i %04d.png interpolated-0.mp4
```

### Re-encode for YouTube (H.264)

```shell
ffmpeg -i "transition.mp4" -c:v libx264 -preset slow -crf 18 -c:a copy -pix_fmt yuv420p "transition.mkv"
```

-c:v libx264  
: Encode video as H.264.

-preset slow  
: Encoding speed vs compression efficiency. Slower presets usually produce smaller files at the same quality.

-crf 18  
: Constant Rate Factor (quality target). Lower = higher quality. Typical “sane” range is ~17–28.

-c:a copy  
: Copy the input audio as-is (no re-encode).

-pix_fmt yuv420p  
: Improves compatibility with many players (QuickTime/Windows Media Player/etc.).

## Video filters

### Stack two videos side-by-side (hstack)

```shell
ffmpeg -i "left.mp4" -i "right.mp4" -filter_complex hstack output.mp4
```

### Vertical scroll and wrap

```shell
ffmpeg -i "input.mp4" -vf "scroll=vertical=0.001,format=yuv420p" output.mp4
```

### Remove black bars from top and bottom (crop)

```shell
ffmpeg -i "input.mp4" -vf "crop=iw:ih-40:0:20" -c:v libx264 -crf 18 -pix_fmt yuv420p output.mp4
```

### Resize a video's height while maintaining aspect ratio

```shell
ffmpeg -i "input.mp4" -vf "scale=-1:1280" -c:v libx264 -crf 18 -pix_fmt yuv420p output.mp4
```

### Crop a video down the center (e.g., to 720 wide)

```shell
ffmpeg -i "input.mp4" -vf "crop=720:ih:((iw-720)/2):0" -c:v libx264 -crf 18 -pix_fmt yuv420p output.mp4
```

### Crop → scale → crop (all in one go)

```shell
ffmpeg -i "input.mp4" -vf "crop=iw:ih-40:0:20,scale=-1:1280,crop=720:ih:((iw-720)/2):0" -c:v libx264 -crf 18 -pix_fmt yuv420p output.mp4
```

## Screen recording (Windows)

> Uses `gdigrab` for desktop capture.

### Record all screens (example: 5 seconds, with audio)

```shell
ffmpeg -f gdigrab -framerate 30 -t 5 -i desktop -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -b:a 128k output.mp4
```

### Record a single region (example: one 1920×1080 screen, 5 seconds, with audio)

```shell
ffmpeg -f gdigrab -framerate 30 -t 5 -offset_x 0 -offset_y 0 -video_size 1920x1080 -i desktop -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -b:a 128k output.mp4
```

### Record the right half of a 5120×1440 screen (no audio)

Right half math:

- Full: 5120×1440
- Right-half width: 2560
- Offset X: 2560

```shell
ffmpeg -f gdigrab -framerate 60 -offset_x 2560 -offset_y 0 -video_size 2560x1440 -i desktop -an output.mp4
```

#### How to stop the recording

- Click the terminal window running FFmpeg and press **`q`** (clean stop / finalizes the file).
- Alternatively, press **Ctrl+C** (works, but `q` is usually cleaner).

## Animated GIF

### Create a GIF from a video (quick/simple)

```shell
ffmpeg -i "input.mp4" output.gif
```

### Create a high-quality GIF from an image sequence (palette workflow)

Generate a palette:

```shell
ffmpeg -y -i %03d.png -vf palettegen palette.png
```

- `-y`: overwrite output
- `-i %03d.png`: reads `001.png`, `002.png`, etc.
- `-vf palettegen`: generates a reduced color palette for better GIF quality/size

Create the GIF using the palette:

```shell
ffmpeg -y -f image2 -framerate 60 -i %03d.png -i palette.png -filter_complex paletteuse file.gif
```

- `-framerate 60`: output GIF frame rate
- `-filter_complex paletteuse`: applies the palette to the GIF for improved quality
