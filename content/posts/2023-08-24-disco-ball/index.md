---
title: Disco Ball
author: Tristan Madden
categories: [JavaScript]
tags: [p5.js]
date: 2023-08-24
usePageBundles: true
featureImage: "thumbnail.png"
thumbnail: "thumbnail.png"
summary: Wife needed a black and white PNG/SVG of a Disco Ball. Yep.
---

Wife needed a black and white PNG/SVG of a Disco Ball. Yep.

```JavaScript
function setup() {
  let c = createCanvas(1024, 1024, WEBGL);
  noStroke();
  noLoop();
  
    //background(0);
  rotateY(HALF_PI * 0.1);
  rotateX(HALF_PI);
  emissiveMaterial(0);
  sphere(399,24,24);
  noStroke()
  
  const bands = 24;
  const maxFacets = 48;
  const minFacets = 0;
  const radius = 400;

  emissiveMaterial(255);
  
  for (let j = 0; j <= bands; j++) {
    let normalizedBand = (j / bands) * PI - HALF_PI;
    let interpolatedValue = sin(normalizedBand + HALF_PI);
    
    let facets = floor(interpolatedValue * (maxFacets - minFacets) + minFacets);
    print(j, normalizedBand, interpolatedValue, facets)
    
    for (let i = 0; i < facets; i++) {
      let lon = (i / facets) * TWO_PI;
      let lat = (j / bands) * PI - HALF_PI;

      let x = radius * cos(lat) * cos(lon);
      let y = radius * cos(lat) * sin(lon);
      let z = radius * sin(lat);

      push();
      translate(x, y, z);
      rotateZ(lon);
      rotateY(HALF_PI - lat);
      plane(50,50);
      pop();
    }
  }
  
saveCanvas(c, 'myCanvas', 'png');

  
}
```