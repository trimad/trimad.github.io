---
title: UVa Online Judge Challenge "10110"
author: Tristan Madden
categories: [Java]
tags: [uva, coding challenge]
date: 2017-10-05
lastmod: 2023-03-10
thumbnail: "thumbnail.png"
usePageBundles: true
summary: "\"There is man named ”mabu” for switching on-off light in our University. He switches on-off the lights
in a corridor. Every bulb has its own toggle switch. That is, if it is pressed then the bulb turns on.
Another press will turn it off. To save power consumption (or may be he is mad or something else)
he does a peculiar thing. If in a corridor there is n bulbs, he walks along the corridor back and forth
n times and in i-th walk he toggles only the switches whose serial is divisable by i. He does not press
any switch when coming back to his initial position. A i-th walk is defined as going down the corridor
(while doing the peculiar thing) and coming back again. Now you have to determine what is the final
condition of the last bulb. Is it on or off?\""
---

## Problem
<div style="position: relative; padding-bottom: 100%; height: 0; overflow: hidden;">
  <iframe src="https://onlinejudge.org/external/101/10110.pdf" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;"  webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>
</div>

## My Solution

```Java
import java.util.Scanner;

public class Main {

	public static void main(String[] args) {

		Scanner sc = new Scanner(System.in);

		while (sc.hasNext()) {

			boolean light = true;
			long n = sc.nextLong();

			if (n == 0) {
				System.exit(0);
			}

			long a = Math.round(Math.sqrt(n));

			if ((a * a) == n) {
				light = true;
			} else {
				light = false;
			}

			if (light) {
				System.out.println("yes");
			} else {
				System.out.println("no");
			}

		}
	}
}
```