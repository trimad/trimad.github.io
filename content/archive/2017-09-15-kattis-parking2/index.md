---
title: Kattis Challenge "Parking"
author: Tristan Madden
categories: [Java]
tags: [kattis, coding challenge]
date: 2017-09-15
lastmod: 2023-03-10
thumbnail: "thumbnail.png"
usePageBundles: true
summary: "\"When shopping on Long Street, Michael usually parks his car at some random location, and then walks to the stores he needs. Can you help Michael choose a place to park which minimises the distance he needs to walk on his shopping round?
Long Street is a straight line, where all positions are integer. You pay for parking in a specific slot, which is an integer position on Long Street. Michael does not want to pay for more than one parking though. He is very strong, and does not mind carrying all the bags around.\""
---

## Problem
<div style="position: relative; padding-bottom: 100%; height: 0; overflow: hidden;">
  <iframe src="https://open.kattis.com/problems/parking2" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;"  webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>
</div>

## My solution

```Java
import java.util.Scanner;
public class Parking {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int t = sc.nextInt();
        for (int i = 0; i < t; i++) {
            int n = sc.nextInt();
            int high = 0;
            int low = 100;
            int d = 0;
            for (int j = 0; j < n; j++) {
                int s = sc.nextInt();
                if (s > high) {
                    high = s;
                }
                if (s < low) {
                    low = s;
                }
                d = (high - low) * 2;
            }
            System.out.println(d);
        }
    }
}
```