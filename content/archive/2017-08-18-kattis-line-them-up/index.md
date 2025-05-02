---
title: Kattis Challenge "Line Them Up"
author: Tristan Madden
categories: [Java]
tags: [kattis, coding challenge]
date: 2017-08-18
lastmod: 2023-03-10
summary: "\"An eccentric coach asks players on the team to line up alphabetically at the start of practice. The coach does not tell the players whether they need to line up in increasing or decreasing order, so they guess. If they guess wrong, the coach makes them run laps before practice. Given a list of names, you are to determine if the list is in increasing alphabetical order, decreasing alphabetical order or neither.\""
thumbnail: "thumbnail.png"
usePageBundles: true

---

## Problem
<div style="position: relative; padding-bottom: 100%; height: 0; overflow: hidden;">
  <iframe src="https://open.kattis.com/problems/lineup" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;"  webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>
</div>

## My solution
```Java
import java.util.ArrayList;
import java.util.Scanner;

public class KattisA {

    public static void main(String[] args) {

        Scanner sc = new Scanner(System.in);
        int N = sc.nextInt();

        boolean incr = false;
        boolean decr = false;

        ArrayList<String> al = new ArrayList();

        for (int i = 0; i <= N; i++) {
            al.add(sc.nextLine());
        }

        for (int i = 1; i < al.size() - 1; i++) {

            //Increasing
            if (al.get(i).charAt(0) < al.get(i + 1).charAt(0)) {
                incr = true;
            }
            //Decreasing
            if (al.get(i).charAt(0) > al.get(i + 1).charAt(0)) {
                decr = true;
            }

            //If the first characters are equal, check the next character
            if (al.get(i).charAt(0) == al.get(i + 1).charAt(0)) {
                //Increasing
                if (al.get(i).charAt(1) < al.get(i + 1).charAt(1)) {
                    incr = true;
                }
                //Decreasing
                if (al.get(i).charAt(1) > al.get(i + 1).charAt(1)) {
                    decr = true;
                }
            }

        }

        if (decr && !incr) {
            System.out.println("DECREASING");
        } else if (!decr && incr) {
            System.out.println("INCREASING");
        } else if ((incr && decr) || (!incr & !decr)) {
            System.out.println("NEITHER");
        }

    }
}
```