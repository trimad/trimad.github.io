---
title: Kattis Challenge "Sum of Others"
author: Tristan Madden
categories: [Java]
tags: [kattis, coding challenge]
date: 2017-09-15
lastmod: 2023-03-10
thumbnail: "thumbnail.png"
usePageBundles: true
summary: "\"Every day, your job requires you to add up long lists of integers, like the following:


 3 + 2 + -4 + 8 + 3 + -6 + 1 + 4 + 6 + -1 + -6 = 10

 
That is, a sum of positive and negative integers, followed by an equals sign, followed by a single integer. To save yourself some time, you normally leave out the 
 and 
 signs as you write down your work, so the previous example would be...\""
---

## Problem
<div style="position: relative; padding-bottom: 100%; height: 0; overflow: hidden;">
  <iframe src="https://open.kattis.com/problems/sumoftheothers" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;"  webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>
</div>

## My solution

```Java
import java.util.Scanner;
public class SumOfOthers {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        while (sc.hasNext()) {
            String[] temp = sc.nextLine().split(" ");
            int answer = 0;
            for (int i = 0; i < temp.length; i++) {
                answer += Integer.parseInt(temp[i]);
            }
            System.out.println(answer/2);
        }
    }
}
```