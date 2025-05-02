---
author: Tristan Madden
categories: [Java]
date: 2017-08-18
lastmod: 2023-03-10
summary: "\"You are in charge of a server that needs to run some submitted tasks on a first-come, first-served basis. Each day, you can dedicate the server to run these tasks for at most minutes. Given the time each task takes, you want to know how many of them will be finished today.\""
tags: [kattis, coding challenge]
thumbnail: "thumbnail.png"
title: Kattis Challenge "Server"
toc: false
usePageBundles: true
---

## Problem
<div style="position: relative; padding-bottom: 100%; height: 0; overflow: hidden;">
  <iframe src="https://open.kattis.com/problems/server" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;"  webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>
</div>

## My solution

```Java
import java.util.Scanner;

public class KattisC {

    public static void main(String[] args) {

        Scanner sc = new Scanner(System.in);

        while (sc.hasNext()) {

            String[] nT = new String[2];

            nT = sc.nextLine().split(" ");

            int n = Integer.parseInt(nT[0]);
            int T = Integer.parseInt(nT[1]);

            int counter = 0;
            int sum = 0;

            String[] posInts = new String[30];

            posInts = sc.nextLine().split(" ");

            while (counter < n) {

                sum += Integer.parseInt(posInts[counter]);

                if (sum > T) {
                   
                    break;
                }
                counter++;

            }

            System.out.println(counter);
        }
    }
}
```