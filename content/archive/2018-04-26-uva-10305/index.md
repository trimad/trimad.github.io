---
title: UVa Online Judge Challenge "10305"
author: Tristan Madden
categories: [Java]
tags: [uva, dag, directed acyclic graph, topological sort, bitset, coding challenge]
date: 2018-04-26
draft: false
summary: This problem presents a DAG and the solution requires implementing a topological sort. I noticed that a topological sort can be implemented using only boolean arrays so I used this as an opportunity to finally get around to using Java's BitSet class. The virtual judge run time was 0.050s.
thumbnail: "thumbnail.png"
usePageBundles: true
---

This problem presents a <a href="https://en.wikipedia.org/wiki/Directed_acyclic_graph">DAG</a> and the solution requires implementing a topological sort. I noticed that a <a href="https://en.wikipedia.org/wiki/Topological_sorting">topological sort</a> can be implemented using only boolean arrays so I used this as an opportunity to finally get around to using Java's BitSet class. The virtual judge run time was 0.050s.

## Problem
<div style="position: relative; padding-bottom: 100%; height: 0; overflow: hidden;">
  <iframe src="https://onlinejudge.org/external/103/10305.pdf" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;"  webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>
</div>

## My Solution

```Java
/* * * * *
Tristan Madden
2018-04-26
https://onlinejudge.org/index.php?option=onlinejudge&page=show_problem&problem=1246
* * * * **/

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.StreamTokenizer;
import java.util.BitSet;
import java.util.Stack;
class Main {
    static MyGraph graph;
    static TurboReader tr = new TurboReader();
    public static void main(String[] args) throws IOException {
        while (true) {
            int m = tr.nextIntUnsafe();
            int n = tr.nextIntUnsafe();
            if (m == 0 && n == 0) {
                break;
            }
            graph = new MyGraph(m);
            for (int i = 0; i < n; i++) {
                int x = tr.nextIntUnsafe();
                int y = tr.nextIntUnsafe();
                graph.addEdge(x - 1, y - 1);
            }
            //System.out.println(Arrays.deepToString(graph.adjacency_matrix).replace("], ", "]\n").replace("[[", "[").replace("]]", "]"));
            graph.topologicalSort();
        }
    }
}
class MyGraph {
    int size;
    BitSet adjacency_matrix;
    BitSet visited;
    Stack<Integer> finishing_times;
    MyGraph(int _size) {
        this.size = _size;
        this.adjacency_matrix = new BitSet(size * size);
        this.visited = new BitSet(size);
    }
    void addEdge(int x, int y) {
        adjacency_matrix.set(x * size + y, true);
    }
    /*
    |* I've loosely modeled Topological Sort after this YouTube video:
    |* https://www.youtube.com/watch?v=HR_aJ1TUw4g
    |* Step 1:
    |* Run DFS
    |* Step 2:
    |* Output the reverse of finishing times of vertices
     */
    void topologicalSort() {
        finishing_times = new Stack<>();
        for (int v = 0; v < size; v++) {
            if (visited.get(v) == false) {
                runDFS(v);
            }
        }
        while (finishing_times.isEmpty() == false) {
            System.out.print(finishing_times.pop() + " ");
        }
        System.out.println("");
    }
    void runDFS(int v) {
        visited.set(v, true);
        for (int w = v; w < size; w++) {
            if (adjacency_matrix.get(v * size + w) == true && visited.get(w) == false) {
                runDFS(w);
            }
        }
        finishing_times.push(v + 1);
    }
}
class TurboReader {
    static InputStreamReader isr;
    static StreamTokenizer st;
    TurboReader() {
        isr = new InputStreamReader(System.in);
        st = new StreamTokenizer(isr);
    }
    int nextIntUnsafe() throws IOException {
        st.nextToken();
        return (int) st.nval;
    }
}
```