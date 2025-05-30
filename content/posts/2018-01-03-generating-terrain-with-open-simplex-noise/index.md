---
title: Generating Terrain with Open Simplex Noise
author: Tristan Madden
date: 2018-01-03
draft: false
tags: [open simplex noise]
categories: [Java, Processing]
summary: "A Processing implementation of a Minecraft-style terrain generator using Open Simplex Noise, featuring 3D voxel-based terrain with performance analysis of random walker agents."
usePageBundles: true
---

Expanding on last night's work with <a href="https://en.wikipedia.org/wiki/OpenSimplex_noise">Open Simplex Noise</a>. I
figured the next logical step was to make a Minecraftian terrain generator, so here it is. If I ever felt compelled to
build a game from the ground up, this would probably be my starting point.

{{< youtube -PTirgC0WX8 >}}

Just to further explore the idea of making a game, I threw some random walkers on my random terrain to see what
performance looked like. I was getting only 30FPS with 64 walkers on a relatively beefy CPU, confirming the obvious fact
that Java is the wrong language for this application.

{{< youtube qxbR32r74no >}}