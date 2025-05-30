---
title: Open Simplex Noise
author: Tristan Madden
date: 2018-01-02
draft: false
tags: [open simplex noise]
categories: [Java, Processing]
summary: "A Processing implementation exploring 4D Simplex Noise to create smooth, organic looping animations through a 2D grid of pixel objects with variable noise scaling."
usePageBundles: true
---

{{< youtube iux8QU8PXaA >}}

So, I was on the hunt for a simpler way to make cool looped animations and stumbled upon this thing called 4D Simplex Noise. I found a super helpful tutorial on necessarydisorder's WordPress page called <a href="https://necessarydisorder.wordpress.com/2017/11/15/drawing-from-noise-and-then-making-animated-loopy-gifs-from-there/">Drawing from noise, and then making animated loopy GIFs from there</a>. It was really informative, got me inspired, and had a spot-on title.

I took what I learned from my past projects and created a 2D grid of pixel objects, animating them by linking their movement to the <a href="https://gist.github.com/Bleuje/fce86ef35b66c4a2b6a469b27163591e">noise function</a>. When I used lower scales (0.001), the motion turned out super smooth and organic, giving me some awesome visual effects.