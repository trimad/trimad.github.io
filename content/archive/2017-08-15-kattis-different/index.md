---
author: Tristan Madden
categories: [Java]
date: 2017-08-15
lastmod: 2023-03-10
summary: "\"Write a program that computes the difference between non-negative integers.\""
tags: [kattis, coding challenge]
thumbnail: "thumbnail.png"
title: Kattis Challenge "A Different Problem"
toc: false
usePageBundles: true
---

## Problem
<div style="position: relative; padding-bottom: 100%; height: 0; overflow: hidden;">
  <iframe src="https://open.kattis.com/problems/different" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;"  webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>
</div>

## My solution

```Java
import java.util.Scanner;

public class Kattis {

    public static void main(String[] args) {

        Scanner sc = new Scanner(System.in);

        while (sc.hasNext()) {

            long X = sc.nextLong();
            long Y = sc.nextLong();

            if (X > Y) {
                System.out.println(Math.abs(X - Y));

            } else {
                System.out.println(Math.abs(X - Y));

            }
        }
    }
}
```