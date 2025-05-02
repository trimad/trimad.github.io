---
title: Cube Wave
author: Tristan Madden
categories: [Java, Processing]
tags: [animation]
date: 2018-12-30
summary: "Here's my take on... Daniel Shiffman's take on... Beesandbomb's take on the cube wave."
usePageBundles: true
thumbnail: "thumbnail.png"
---
Here's my take on... Daniel Shiffman's take on... Beesandbomb's take on the cube wave.

{{< youtube zrtX8r3BlVE >}}
{{< youtube me28ae0pgAU >}}
{{< youtube ZkHZVCKr5vQ >}}
{{< youtube LAVqQaA6pGQ >}}

```Java

import peasy.*;
import peasy.org.apache.commons.math.*;
import peasy.org.apache.commons.math.geometry.*;

PeasyCam cam;

float angle = 0;
int w = 16;
float magicAngle;
float maxD;
int orthoBound = 2048;

void setup() {
  //fullScreen(P3D);
  size(900, 900, P3D);
  magicAngle = atan(1 / sqrt(2));
  maxD = dist(0, 0, height, height);
  cam = new PeasyCam(this, 2048);
  cam.setMinimumDistance(0);
  cam.setMaximumDistance(4096);
}

void draw() {
  background(0);
  ortho(-orthoBound, orthoBound, orthoBound, -orthoBound, 0, orthoBound);
  ambientLight(127, 127, 127);
  //Red
  pointLight(255, 127, 127, 0, 0, 0);
  //Green
  pointLight(127, 255, 127, width / 2, 0, height / 2);
  //Blue
  pointLight(127, 127, 255, 0, 0, height);
  rotateX(-magicAngle);
  rotateY(-QUARTER_PI);

  for (int z = 0; z < height; z += w) {
    for (int x = 0; x < width; x += w) {
      pushMatrix();
      float d = dist(x, z, width / 2, height / 2);
      float offset = map(d, 0, maxD, -PI, PI);
      float a = angle + offset;
      float howHigh = map(sin(a), -1, 1, w, height);
      translate(x, 0, z);
      shininess(15.0); 
      //ambientMaterial(255);
      //specularMaterial(255);
      //normalMaterial();
      //texture(img);
      box(w, howHigh, w);
      popMatrix();
    }
  }
  angle -= 0.01;
}```

<h2>Sources</h2>

- <a href="https://twitter.com/beesandbombs/status/940639806522085376">https://twitter.com/beesandbombs/status/940639806522085376</a>

- <a href="https://www.youtube.com/watch?v=H81Tdrmz2LA">https://www.youtube.com/watch?v=H81Tdrmz2LA</a>