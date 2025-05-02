---
title: UVa Online Judge Challenge "272"
author: Tristan Madden
categories: [Java]
tags: [uva, coding challenge]
date: 2017-10-17
lastmod: 2023-03-10
thumbnail: "thumbnail.png"
usePageBundles: true
summary: "\"TEX is a typesetting language developed by Donald Knuth. It takes source text together with a few
typesetting instructions and produces, one hopes, a beautiful document. Beautiful documents use...\""
---

## Problem
<div style="position: relative; padding-bottom: 100%; height: 0; overflow: hidden;">
  <iframe src="https://onlinejudge.org/external/2/272.pdf" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;"  webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>
</div>

## My Solution

```Java
import java.util.Scanner;

public class Main {

    public static void main(String[] args){

        Scanner sc = new Scanner(System.in);
        
        boolean verticalMarks = false;
        
        while (sc.hasNextLine()) {

            StringBuilder sb = new StringBuilder();

            String input = sc.nextLine();

            for (int i = 0; i < input.length(); i++) {
                
                if (input.charAt(i) == 34) {

                    if (!verticalMarks) {

                        sb.append("``");

                        verticalMarks = true;

                    } else if (verticalMarks) {
                        
                        sb.append("''");
                        
                        verticalMarks = false;

                    }

                } else {

                    sb.append(input.charAt(i));

                }

            }

            System.out.println(sb);

        }

    }

}
```