---
title: UVa Online Judge Challenge "100"
author: Tristan Madden
categories: [Java]
tags: [uva, coding challenge]
date: 2017-10-05
lastmod: 2023-03-10
thumbnail: "thumbnail.png"
usePageBundles: true
summary: "\"Problems in Computer Science are often classified as belonging to a certain class of problems (e.g.,
NP, Unsolvable, Recursive). In this problem you will be analyzing a property of an algorithm whose
classification is not known for all possible inputs.
Consider the following algorithm...\""
---

## Problem
<div style="position: relative; padding-bottom: 100%; height: 0; overflow: hidden;">
  <iframe src="https://onlinejudge.org/external/1/100.pdf" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;"  webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>
</div>

## My Solution
```Java
import java.io.IOException;
import java.util.Scanner;

public class Main {

    public static void main(String[] args) throws IOException {

        Scanner sc = new Scanner(System.in);
        
        while (sc.hasNext()) {

            int n1 = sc.nextInt();
            int n2 = sc.nextInt();

            if (n2  n1) {
                int largest = 0;

                for (int i = n1; i = n2; i++) {
                    int temp = collatz(i, 1);
                    if (temp  largest) {
                        largest = temp;
                    }
                }
                
                System.out.println(n1 +   + n2 +   + largest);
            } else if (n2  n1) {
                int largest = 0;

                for (int i = n2; i = n1; i++) {
                    int temp = collatz(i, 1);
                    if (temp  largest) {
                        largest = temp;
                    }
                }
                System.out.println(n1 +   + n2 +   + largest);
            } else if (n2 == n1) {
                int temp = collatz(n1, 1);
                System.out.println(n1 +   + n2 +   + temp);
            }

        }
    }

    public static int collatz(long input, int cycleLength) {

        long n = input;
        int counter = cycleLength;

        if (n == 1) {
            return counter;
        } else if (n % 2 != 0) {
            n = 3  n + 1;
            counter++;
            return collatz(n, counter);
        } else {
            n = n  2;
            counter++;
            return collatz(n, counter);
        }

    }
}
```