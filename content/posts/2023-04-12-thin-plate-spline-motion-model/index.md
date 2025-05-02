---
author: Tristan Madden
categories: [Python]
date: 2023-04-12
lastmod: 2023-04-13
draft: false
summary: "This is my tentative workflow for using this repository to animate static images using a driving video."
tags: [animation, ai, video]
thumbnail: "thumbnail.gif"
title: "Thin Plate Spline Motion Model"
toc: true
usePageBundles: true
---

This is my tentative workflow for using this repository to animate static images using a driving video.

## <a href="https://github.com/yoyo-nb/Thin-Plate-Spline-Motion-Model">GitHub Repository</a>

### Conda Environment and Usage

```Shell
conda activate thin-plate-spline
```
```Shell
cd C:\Users\trima\Documents\GitHub\Thin-Plate-Spline-Motion-Model
```
```Shell
python demo.py --config config/vox-256.yaml --checkpoint checkpoints/vox.pth.tar --source_image assets/source.png --driving_video assets/driving.mp4
```
```Shell
python demo.py --config config/vox-256.yaml --checkpoint checkpoints/vox.pth.tar --find_best_frame --source_image assets/0014.png --driving_video assets/driving.mp4 --result_video output.mp4
```

### First Test

{{< youtube p4PoMEeVxoU >}}

* As far as I can tell, this program requires a `driving_video` that is 1:1 aspect ratio. Makes sense because the model was trained on 256x256 data. 
* It really doesn't like a zooming or panning camera. I diffused frame 420 and the frames nearest that frame are definitely where the `result_video` is most coherent, and farthest away from frame 420 it's lost motion tracking entirely.
* The `result_video` is 256x256. By default, this program doesn't output the invididual frames. Probably wouldn't be hard to make this change so the frames can be uspcaled.

![This was the source_image used for the video above.](original.png)




