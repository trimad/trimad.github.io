---
title: Minimum Spanning Tree Visualized
author: Tristan Madden
categories: [Java, Processing]
tags: [prim's algorithm, minimum spanning tree]
date: 2018-04-07
usePageBundles: true
thumbnail: "thumbnail.webp"
featureImage: "thumbnail.webp"
draft: false
---

I'm working on a few programs that I will be using using to visualize algorithms on procedurally generated terrain. This particular program visualizes a minimum spanning tree using <a href="https://en.wikipedia.org/wiki/Prim%27s_algorithm">Prim's Algorithm</a> on random walkers. The terrain is 128x128 tiles, each containing 4 vertices on the negative y-axis that I applied a <a href="https://en.wikipedia.org/wiki/Perlin_noise">Perlin Noise</a> height map to. The map projection is orthographic, so all objects with the same dimension appear the same size, regardless of whether they are near or far from the camera. The frames were rendered at 1920x1080 resolution.

{{< youtube RwauA6p1Cic >}}