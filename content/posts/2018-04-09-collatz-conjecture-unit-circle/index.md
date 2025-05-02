---
title: Collatz Conjecture + Unit Circle
author: Tristan Madden
categories: [Java, Processing]
tags: [collatz conjecture, 3n+1]
date: 2018-04-09
thumbnail: "thumbnail.png"
draft: false
thumbnail: "thumbnail.png"
usePageBundles: true
summary: I created my own Collatz Conjecture visualization, experimenting with a unit circle design that resulted in 360 distinct "branches". While it may not offer groundbreaking insights, the process was enjoyable and yielded interesting results, particularly for the number 327.
---

Inspired by <a href="https://www.bradyharanblog.com/blog/the-collatz-conjecture-in-colour">this cool page</a>, I decided to make my own Collatz Conjecture visualization. My first try looked a lot like what I saw in the Numberphile video, which was pretty good. But then I thought of trying something new by keeping the original rules and wrapping everything around a unit circle. This created 360 "branches", each showing a 1-degree turn.

Even though this new approach might not reveal any groundbreaking insights into the Collatz Conjecture, I had a lot of fun with it and got some interesting results. The number 327, in particular, had a really long and cool path in this version.

{{< youtube 8wpbfGuhH4g >}}

```Java
import java.util.*;

int howMany = 361;
int howManyFrames = 9840; //2:44 @ 60FPS
int size=30;

Stack[] stacks = new Stack[howMany];
Turtle[] turtles = new Turtle[howMany];

void setup() {
  size(1080,1080, P3D);
  //fullScreen(P3D);
  background(0);
  textAlign(LEFT, CENTER);
  textSize(size);

  for (int i = 0; i < howMany; i++) {
    stacks[i] = new Stack();
    collatz(i, stacks[i]);
  }

  for (int i = 0; i < howMany; i++) {
    turtles[i] = new Turtle(width/4, height/4, stacks[i]);
  }
}

public void collatz(int n, Stack s) {
  s.add(n);
  if (n == 1 || n==0) return;
  else if (n % 2 == 0) collatz(n / 2, s);
  else collatz(3*n + 1, s);
}

void draw() {
  translate(width/2, height/2, -1750);
  for (int i = 1; i < howMany; i++) {
    float m = map(i, 0, howMany-2, 0, (float)Math.PI*2);
    rotateZ(-m);  
    turtles[i].crawl();
    rotateZ(m);
  }
/*
  if (frameCount<howManyFrames+1) {
    saveFrame("frame-####.png");
  } else {
    exit();
  }
  */
}

void keyTyped() {


  if (int(key) ==32) {
    saveFrame("frame-####.png");
  }
}
```

```Java
class Turtle {

  PVector v1;
  int counter;
  Stack values;

  Turtle(float _x, float _y, Stack _values) {
    this.v1 = new PVector(_x, _y, 0);
    this.values = _values;
    this.counter = 1;
  }

  void crawl() {

    float rg = map(counter, 0, this.values.size(), 0, 255);
    float b = map(frameCount, 0, howManyFrames, 0, 255);

    if (counter<this.values.size()) {

      int d = (int)this.values.get(this.counter);

      //PVector v2 = PVector.fromAngle(degrees(d));
      PVector v2 = PVector.fromAngle(radians(d));

      this.v1.x += v2.x;
      this.v1.y += v2.y;

      stroke(0, 31);
      fill(255-rg, rg, b);
      ellipse(this.v1.x, this.v1.y, size, size);
    } else {
      //noStroke();
      //fill(53, m, 255-m);
      //ellipse(this.v1.x, this.v1.y, size, size);
      //fill(255);

      //text(this.values.get(0)+"", this.v1.x+size/2, this.v1.y);
    }

    if (frameCount%60==0) {
      counter++;
    }
  }
}
```