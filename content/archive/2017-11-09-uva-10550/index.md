---
title: UVa Online Judge Challenge "10550"
author: Tristan Madden
categories: [Java]
tags: [uva, coding challenge]
date: 2017-11-09
lastmod: 2023-03-10
thumbnail: "thumbnail.png"
usePageBundles: true
summary: "\"Now that you’re back to school for another term, you need to
remember how to work the combination lock on your locker. A
common design is that of the Master Brand, shown at right. The
lock has a dial with 40 calibration marks numbered 0 to 39. A
combination consists of 3 of these numbers; for example: 15-25-8.
To open the lock, the following steps are taken...\""
---

## Problem
<div style="position: relative; padding-bottom: 100%; height: 0; overflow: hidden;">
  <iframe src="https://onlinejudge.org/external/105/10550.pdf" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;"  webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>
</div>

## My Solution

```Java
import java.util.Scanner;

public class Main {

	public static void main(String[] args) {

		Scanner sc = new Scanner(System.in);

		while (sc.hasNext()) {

			String temp[] = sc.nextLine().split(" ");
			if (Integer.parseInt(temp[0]) == 0 && Integer.parseInt(temp[1]) == 0 && Integer.parseInt(temp[2]) == 0
					&& Integer.parseInt(temp[3]) == 0) {

				break;
			} else {
				System.out.println(1080 + ((Integer.parseInt(temp[0]) - Integer.parseInt(temp[1]) + 40) % 40
						+ (Integer.parseInt(temp[2]) - Integer.parseInt(temp[1]) + 40) % 40
						+ (Integer.parseInt(temp[2]) - Integer.parseInt(temp[3]) + 40) % 40) * 9);
			}
		}

	}
}
```