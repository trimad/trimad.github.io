---
author: Tristan Madden
categories: [Shell]
date: 2022-01-27
featured: true
lastmod: 2023-03-16
tags: [audio, video]
title: ffmpeg
toc: true
thumbnail: "thumbnail.png"
usePageBundles: true
---

ffmpeg is a complete, cross-platform solution to record, convert and stream audio and video.
<h2><a href="https://www.ffmpeg.org/download.html#build-windows">ffmpeg Download</a></h2>
<h2><a href="https://ffmpeg.org/ffmpeg.html">ffmpeg Documentation
</a></h2>

## Audio Processing
### Convert to 8kHz, single-channel PCM

```Shell
ffmpeg -i "input.mp3" -ar 8000 -ac 1 output.wav
```

### Convert to 16kHz, single-channel PCM

```Shell
ffmpeg -i "input.mp3" -ar 16000 -ac 1 output.wav
```

### Convert to 48kHz, single-channel PCM

```Shell
ffmpeg -i input.mp3 -ar 48000 -ac 1 output.wav
```

## Video Processing
### Add Music to a Video

```Shell
ffmpeg -i video.mp4 -i music.mp3 -codec copy -shortest output.mp4
```

-i video.mp4
: Select “video.mp4” as an input file from the same directory.

-i music.mp3
: Select “music.mp4” as an input file from the same directory.

-codec copy
: Specifies that we are not re-encoding anything.

-shortest
: Use this flag if the video length is shorter than the audio length. Otherwise, use no flag at all here.

### Assemble images into a video

```Shell
ffmpeg -framerate 60 -s 2560x1440 -i %04d.png output.mp4
```

-framerate 60
: Set the frame rate to 60FPS.

-s 2560x1440
: Set the video resolution to 2560x1440 pixels.

-i %04d.png
: This flag assumes there is a folder of .png files in the same directory named in the format 0001.png, 0002.png, etc. It will load all images following this naming convention as inputs to be processed.

```Shell
>ffmpeg -start_number 0140 -i %04d.png interpolated-0.mp4
```

### Re-encode Video For YouTube

```Shell
ffmpeg -i transition.mp4 -c:v libx264 -preset slow -crf 18 -c:a copy -pix_fmt yuv420p transition.mkv
```

-i transition.mp4
: Select "transition.mp4" as the input file.

-c:v libx264
: set the video codec to H.264

-preset slow
: A preset is a collection of options that will provide a certain encoding speed to compression ratio. A slower preset will provide better compression (compression is quality per filesize). This means that, for example, if you target a certain file size or constant bit rate, you will achieve better quality with a slower preset. Similarly, for constant quality encoding, you will simply save bitrate by choosing a slower preset. Use the slowest preset that you have patience for. The available presets in descending order of speed are:
- ultrafast
- superfast
- veryfast
- faster
- fast
- medium (default preset)
- slow
- slower
- veryslow

-crf 18
: Constant Rate Factor (CRF). The range of the CRF scale is 0–51, where 0 is lossless, 23 is the default, and 51 is worst quality possible. A lower value generally leads to higher quality, and a subjectively sane range is 17–28. Consider 17 or 18 to be visually lossless or nearly so; it should look the same or nearly the same as the input but it isn't technically lossless.

-c:a copy
: Copy the audio codec from that of the input file to the output file

-pix_fmt yuv420p
: This flag is only needed for your output to work in QuickTime, Windows Media player and other offline media players. These players only support the YUV planar color space with 4:2:0 chroma subsampling for H.264 video. Otherwise, depending on your source, ffmpeg may output to a pixel format that may be incompatible with these players.

<h2>Video Filters</h2>

### Stack two videos side-by-side

```Shell
ffmpeg -i "left.mp4" -i "right.mp4" -filter_complex hstack output.mp4
```
This command uses the ffmpeg software to combine two video files, "left.mp4" and "right.mp4", into a single output video file "output.mp4". The "-i" option specifies the input video files. The "-filter_complex" option applies the "hstack" filter, which horizontally stacks the two input videos side by side to form a single output video.

### Vertical scroll and wrap

```Shell
ffmpeg -i input.mp4 -vf scroll=vertical=0.001,format=yuv420p output.mp4
```

This ffmpeg command takes an input video file named "input.mp4" and applies a video filter to it that creates a scrolling effect with a vertical scroll speed of 0.001 units per frame. The output video is then saved as "output.mp4" in the YUV420P format.

### Remove black bars from top and bottom of video

```Shell
ffmpeg -i input.mp4 -vf "crop=iw:ih-40:0:20" -c:v libx264 -crf 18 -pix_fmt yuv420p output.mp4
```

### Resize a video's height while maintaining aspect width aspect ratio

```Shell
ffmpeg -i input.mp4 -vf "scale=-1:1280" -c:v libx264 -crf 18 -pix_fmt yuv420p output.mp4
```

### Crop a video down the center

```Shell
ffmpeg -i input.mp4 -vf "crop=720:ih:((iw-720)/2):0" -c:v libx264 -crf 18 -pix_fmt yuv420p output.mp4
```

### Do the above three in one go

```Shell
ffmpeg -i input.mp4 -vf "crop=iw:ih-40:0:20,scale=-1:1280,crop=720:ih:((iw-720)/2):0" -c:v libx264 -crf 18 -pix_fmt yuv420p output.mp4
```

## Screen recording

### All screens

```Shell
ffmpeg -f gdigrab -framerate 30 -t 5 -i desktop -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -b:a 128k output.mp4
```

### Just one screen 
```Shell
ffmpeg -f gdigrab -framerate 30 -t 5 -offset_x 0 -offset_y 0 -video_size 1920x1080 -i desktop -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -b:a 128k output.mp4
```


## Animated GIF

### Create an animated GIF from a video

```Shell
ffmpeg -i input.mp4 output.gif
```

### Assembled a folder of images into an animated GIF

### Generate a palette

```Shell
ffmpeg -y -i %3d.png -vf palettegen palette.png
```

The command line above is using FFmpeg to process a sequence of PNG images, where each image is named with a number and a 3 digit format, such as "001.png", "002.png", etc. In summary, this command is generating a color palette from a sequence of PNG images and saving the palette to the file "palette.png". This palette can be used to create a GIF animation from the sequence of images. The resulting palette will have a smaller number of colors than the original images, allowing for a smaller file size for the final GIF.

The options used in the command are:

* "-y" : Overwrite output files without asking.
* "-i %3d.png" : The input file is a sequence of PNG images, where the file name format is "%3d" (3 digits) followed by ".png"
* "-vf palettegen" : This is a video filter that generates a color palette from the input image sequence.
* "palette.png" : This is the output file name for the generated color palette.
In summary, this command is generating a color palette from a sequence of PNG images and saving the palette to the file "palette.png". This palette can be used to create a GIF animation from the sequence of images. The resulting palette will have a smaller number of colors than the original images, allowing for a smaller file size for the final GIF.

### Create an animated GIF using the previously generated color palette

```Shell
ffmpeg -y -f image2 -framerate 60 -i %3d.png -i palette.png -filter_complex paletteuse file.gif
```

The command line above is using FFmpeg to create a GIF animation from a sequence of PNG images and a previously generated color palette.

The options used in the command are:

* "-y" : Overwrite output files without asking.
* "-f image2" : The input is a sequence of image files
* "-framerate 60" : The frame rate for the output gif is set to 60 frames per second
* "-i %3d.png" : The input file is a sequence of PNG images, where the file name format is "%3d" (3 digits) followed by ".png"
* "-i palette.png" : The input file is the previously generated color palette
* "-filter_complex paletteuse" : This is a filter that uses the previously generated palette to create the gif animation
* "file.gif" : This is the output file name for the created gif animation
In summary, this command is creating a gif animation from a sequence of PNG images using a previously generated color palette, and saving the animation to the file "file.gif". The resulting gif animation will have the same frame rate as the input images and a smaller file size due to the use of a limited color palette.