---
title: Ulam Spiral
author: Tristan Madden
categories: [Javascript, p5.js]
tags: [prime numbers, processing, interactive]
date: 2018-05-17
thumbnail: "thumbnail.png"
usePageBundles: true
---

<div class="iframe-wrapper-1-1">
    <iframe src="https://editor.p5js.org/Berkanan/full/PiHPI8iAw"></iframe>
</div>

<h2><a href="https://editor.p5js.org/Berkanan/full/PiHPI8iAw" target="_blank">Launch this sketch is a new window (recommended)</a></h2>

<h2><a href="https://editor.p5js.org/Berkanan/sketches/PiHPI8iAw">Launch p5.js web editor</a></h2>

The  <a href="https://en.wikipedia.org/wiki/Ulam_spiral">Ulam Spiral</a> or prime spiral is a graphical depiction of the set of prime numbers, devised by mathematician Stanislaw Ulam in 1963 and popularized in Martin Gardner's Mathematical Games column in Scientific American a short time later. It is constructed by writing the positive integers in a square spiral and specially marking the prime numbers.

What I've done differently is allowed for iterating every integer in the grid forwards or backwards to search for long, connected diaganal lines of prime numbers in the grid. The framerate of the animation can be adjusted, as well as the "grid multiplier" which is how many cells to draw in each row and collumn. Double-clicking on the menu collapses it. There are also basic keyboard arrow controls:

<h2>Controls</h2>
- LEFT ARROW = Step backward
- RIGHT ARROW = Step forwards
- UP ARROW = Pause
- DOWN ARROW = Pause