---
title: UVa Online Judge Challenge "11172"
author: Tristan Madden
categories: [Java]
tags: [uva, coding challenge]
date: 2017-08-24
lastmod: 2023-03-10
thumbnail: "thumbnail.png"
usePageBundles: true
summary: "\"Some operators checks about the relationship between two values and these operators are called relational operators. Given two numerical values your job is just to find out the relationship between them
that is (i) First one is greater than the second (ii) First one is less than the second or (iii) First and
second one is equal.\""
---

## Problem
<div style="position: relative; padding-bottom: 100%; height: 0; overflow: hidden;">
  <iframe src="https://onlinejudge.org/external/111/11172.pdf" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;"  webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>
</div>

## My solution

```Java
import java.util.Scanner;

class Main {

    public static void main(String[] args) {

        int a, b, t;

        Scanner sc = new Scanner(System.in);
        t = sc.nextInt();
        sc.nextLine();

        while (t > 0) {
            String temp = sc.nextLine();
            String[] str_array = temp.split(" ");
            a = Integer.parseInt(str_array[0]);
            b = Integer.parseInt(str_array[1]);

            if (a > b) {
                System.out.println(">");
            } else if (a < b) {
                System.out.println("<");
            } else {
                System.out.println("=");
            }
            t--;
        }
    }
}
```