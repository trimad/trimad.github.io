---
title: UVa Online Judge Challenge "1112"
author: Tristan Madden
categories: [Java]
tags: [uva, coding challenge]
date: 2018-04-09
usePageBundles: true
thumbnail: "thumbnail.png"
draft: false
---

This problem involves a relatively small graph, so I opted to implement the <a href="https://en.wikipedia.org/wiki/Floyd%E2%80%93Warshall_algorithm">Floyd-Warshall Algorithm</a> instead of <a href="https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm">Dijkstra's Algorithm</a> for the sake of simplicity. This algorithm finds the shortest path between every pair of vertices in a graph, running in O(n^3) time. Although this might sound inefficient, the UVA judge accepted this program with a runtime of 0.12 seconds, which is well within the 3-second threshold. I designed this algorithm using an object-oriented approach and avoided arrays, so that if I ever have enough free time, I can easily integrate it into Processing and visualize it in 3D.

## Problem
<div style="position: relative; padding-bottom: 100%; height: 0; overflow: hidden;">
  <iframe src="https://onlinejudge.org/external/11/1112.pdf" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;"  webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>
</div>

## My Solution

```Java
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
public class Main {
    static int N;
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        final int MAX = 101;
        int cases, E, T, M;
        String blank;
        cases = Integer.parseInt(br.readLine());
        while (cases-- > 0) {
            ArrayList<myPoint3D> cells = new ArrayList();
            blank = br.readLine();
            N = Integer.parseInt(br.readLine());
            E = Integer.parseInt(br.readLine());
            T = Integer.parseInt(br.readLine());
            M = Integer.parseInt(br.readLine());
            /*
            1. let dist be a |V| × |V| array of minimum distances initialized to ∞ (infinity)
            2. for each edge (u,v)
            3. dist[u][v] ← w(u,v)  // the weight of the edge (u,v)
             */
            for (int x = 0; x < N; x++) {
                for (int y = 0; y < N; y++) {
                    cells.add(new myPoint3D(x, y, MAX));
                }
            }
            /*
            4. for each vertex v
            5.    dist[v][v] ← 0
            --------------------------------------------------------------------
            The time it takes to get from any vertex to itself is always going to be zero.
             */
            for (int i = 0; i < N; i++) {
                int index = getIndex(i, i);
                cells.get(index).z = 0;
            }
            /*
            Modify the grid with the UVA problem inputs
             */
            for (int i = 0; i < M; i++) {
                String[] temp = br.readLine().split(" ");
                int a = Integer.parseInt(temp[0]) - 1;
                int b = Integer.parseInt(temp[1]) - 1;
                int t = Integer.parseInt(temp[2]);
                int index = getIndex(a, b);
                cells.get(index).z = t;
            }
            /*
            6. for k from 1 to |V|
            7.    for i from 1 to |V|
            8.       for j from 1 to |V|
            9.          if dist[i][j] > dist[i][k] + dist[k][j] 
            10.             dist[i][j] ← dist[i][k] + dist[k][j]
            11.         end if
             */
            for (int k = 0; k < N; k++) {
                for (int i = 0; i < N; i++) {
                    for (int j = 0; j < N; j++) {
                        int IJ = getIndex(i, j);
                        int IK = getIndex(i, k);
                        int KJ = getIndex(k, j);
                        if (cells.get(IJ).z > cells.get(IK).z + cells.get(KJ).z) {
                            cells.get(IJ).z = cells.get(IK).z + cells.get(KJ).z;
                        }
                    }
                }
            }
            int counter = 0;
            for (int i = 0; i < N; i++) {
                int index = getIndex(i, E - 1);
                if (cells.get(index).z <= T) {
                    counter++;
                }
            }
            System.out.println(counter);
            if (cases > 0) {
                System.out.println("");
            }
        }
    }
    static int getIndex(int x, int y) {
        return x * N + y;
    }
}
class myPoint3D {
    int x;
    int y;
    int z;
    myPoint3D(int x, int y, int z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}
```