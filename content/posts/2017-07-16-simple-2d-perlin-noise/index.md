---
author: Tristan Madden
date: 2017-07-16
draft: false
tags: ["interactive","JavaScript","p5.js"]
categories: ["JavaScript","p5.js"]
summary: "An interactive p5.js sketch that generates 2D terrain using Perlin noise, with different colors representing water, sand, and grass based on elevation values."
toc: true
usePageBundles: true
---

This sketch maps perlin noise between a value of 0 and 255 across a grid. Values greater than or equal to 100 are
"grass", values between 75 and 100 are "sand", and values less than or equal to 75 are "water".

 <iframe width=100% height=1024px src="https://editor.p5js.org/Berkanan/full/LbNSvlqKU"></iframe>

<center><em>click mouse in iframe to generate a new map</em></center>
<br>


<h2><a class="btn btn-outline-secondary btn-lg" href="https://editor.p5js.org/Berkanan/sketches/LbNSvlqKU">Edit This Sketch</a></h2>