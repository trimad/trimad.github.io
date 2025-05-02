---
title: Juno Cam Image Processing
author: Tristan Madden
categories: [Java, Processing]
tags: [juno,jupiter,space]
date: 2017-11-12
usePageBundles: true
thumbnail: "thumbnail.jpg"
featureImage: "thumbnail.jpg"
draft: false
---
This is a program I wrote last November that assembles raw image data coming from the Juno Spacecraft. When I started, I thought it would be cool if this program ran in a browser window. When I finished, I was certain that this program should have been a desktop application. The final images this program produces are quite large; well over 20mb, showing the individual red, green, blue, and composite brightness data. Here's a <a href="https://www.missionjuno.swri.edu/junocam/processing">block of text ripped from the JunoCam website</a> that does a good job of explaining why these images need to be reconstructed:

> Like previous MSSS cameras (e.g., Mars Reconnaissance Orbiter’s Mars Color Imager) Junocam is a "pushframe" imager. The detector has multiple filter strips, each with a different bandpass, bonded directly to its photoactive surface. Each strip extends the entire width of the detector, but only a fraction of its height; Junocam's filter strips are 1600 pixels wide and about 155 rows high. The filter strips are scanned across the target by spacecraft rotation. At the nominal spin rate of 2 RPM, frames are acquired about every 400 milliseconds. Junocam has four filters: three visible (red/green/blue) and a narrowband "methane" filter centered at about 890 nm.

> The spacecraft spin rate would cause more than a pixel's worth of image blurring for exposures longer than about 3.2 milliseconds. For the illumination conditions at Jupiter such short exposures would result in unacceptably low SNR, so the camera provides Time-Delayed-Integration (TDI). TDI vertically shifts the image one row each 3.2 milliseconds over the course of the exposure, cancelling the scene motion induced by rotation. Up to about 100 TDI steps can be used for the orbital timing case while still maintaining the needed frame rate for frame-to-frame overlap. For Earth Flyby the light levels are high enough that TDI is not needed except for the methane band and for nightside imaging.

> Junocam pixels are 12 bits deep from the camera but are converted to 8 bits inside the instrument using a lossless "companding" table, a process similar to gamma correction, to reduce their size. All Junocam products on the missionjuno website are in this 8-bit form as received on Earth. Scientific users interested in radiometric analysis should use the "RDR" data products archived with the Planetary Data System, which have been converted back to a linear 12-bit scale.

<h2><a href="https://www.missionjuno.swri.edu/junocam/processing?id=2560">View on NASA website</a></h2>

<h2><a href="https://github.com/Trimad/Juno_Cam">GitHub Repository</a></h2>