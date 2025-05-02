---
title: UVa Online Judge Challenge "572"
author: Tristan Madden
categories: [Java]
tags: [uva, coding challenge, disjoint set]
date: 2018-04-23
usePageBundles: true
summary: "Although BFS and DFS were recommended solutions to the problem, I saw an
opportunity to solve this problem using Disjoint Sets. The
virtual judge run time was 0.050s."
thumbnail: "thumbnail.png"
draft: false
---

Although <a href="https://en.wikipedia.org/wiki/Breadth-first_search">BFS</a> and <a
    href="https://en.wikipedia.org/wiki/Depth-first_search">DFS</a> were recommended solutions to the problem, I saw an
opportunity to solve this problem using <a href="https://en.wikipedia.org/wiki/Disjoint-set_data_structure">Disjoint Sets</a>. The
virtual judge run time was 0.050s.

## Problem
<div style="position: relative; padding-bottom: 100%; height: 0; overflow: hidden;">
  <iframe src="https://onlinejudge.org/external/5/572.pdf" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;"  webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>
</div>

## My Solution

```Java
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        while (true) {
            String[] dimensions = br.readLine().split(" ");
            int rows = Integer.parseInt(dimensions[0]);
            if (rows == 0) {
                System.exit(0);
            }
            int cols = Integer.parseInt(dimensions[1]);
            int size = rows * cols;
            DisjointSet ds = new DisjointSet(size);
            byte[] flattenedGrid = new byte[size];
            /*
            |* This is a 2D grid of characters that I am flattening into a 1D byte 
            |* array. There are only two bytes that I am concerned with: 42 and 64.
            |* 64 represents an oil deposit whereas 42 represent the absence thereof. 
             */
            for (int x = 0; x < rows; x++) {
                System.arraycopy(br.readLine().getBytes(), 0, flattenedGrid, x * cols, cols);
            }
            /*
            |* "Stand" on every position of the grid. If you are standing over
            |* oil, look in every direction around you for an adjacent
            |* oil deposit. Every time oil is spotted adjacent to where you are
            |* standing, union your position and that position into the same set.
             */
            for (int x = 0; x < rows; x++) {
                for (int y = 0; y < cols; y++) {
                    int[] directions = new int[]{-1, -1, -1, -1, -1, -1, -1, -1}; //8 directions
                    int position = x * cols + y;
                    if (flattenedGrid[position] == 64) { //If you are standing on an oil depost
                        if (x > 0) {
                            directions[1] = ((x - 1) * cols) + y;//north
                        }
                        if (y < cols - 1) {
                            directions[2] = ((x - 1) * cols) + y + 1;//north east
                            directions[3] = position + 1;//east
                            directions[4] = ((x + 1) * cols) + y + 1;//south east
                        }
                        if (y > 0) {
                            directions[0] = ((x - 1) * cols) + y - 1;//north west
                            directions[6] = ((x + 1) * cols) + y - 1;//south west
                            directions[7] = position - 1;//west
                        }
                        if (x < rows - 1) {
                            directions[5] = ((x + 1) * cols) + y;//south
                        }
                        /*
                        |* This loop does the actual comparisons and
                        |* if both positions have oil, unions them.
                         */
                        for (int i = 0; i < directions.length; i++) {
                            if (directions[i] >= 0 && directions[i] < size) {
                                if (flattenedGrid[directions[i]] == 64) {
                                    ds.union(position, directions[i]);
                                }
                            }
                        }
                    }
                }
            }
            /*
            |* Now that the algorithm is finished, I count the number of
            |* disjoint sets. This represents the number of distinct oil deposits. 
             */
            int[] counter = new int[size];
            int distinctOilDeposits = 0;
            for (int i = 0; i < size; i++) {
                if (flattenedGrid[i] == 64) {
                    int cursor = ds.find(i);
                    if (counter[cursor] == 0) {
                        distinctOilDeposits++;
                        counter[cursor]++;
                    } else {
                        counter[cursor]++;
                    }
                }
            }
            System.out.println(distinctOilDeposits);
        }
    }
}
class DisjointSet {
    int parent[];
    DisjointSet(int size) {
        parent = new int[size];
        int i;
        for (i = 0; ++i < size;) {
            parent[i] = i;
        }
    }
    int find(int n) {
        return n == parent[n] ? n : find(parent[n]);
    }
    void union(int x, int y) {
        parent[find(x)] = find(y);
    }
}
```