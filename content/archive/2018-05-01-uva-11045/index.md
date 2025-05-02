---
title: UVa Online Judge Challenge "11045"
author: Tristan Madden
categories: [Java]
tags: [uva, maximum flow, bipartite graph, coding challenge]
date: 2018-05-01
usePageBundles: true
featureImage: "uva11045.jpg"
thumbnail: "uva11045.jpg"
summary: This is a maximum flow problem on a bipartite graph. I created the flow chart above to visualize the 3 test cases. The virtual judge run time was 0.18s.
---

This is a <a href="https://en.wikipedia.org/wiki/Maximum_flow_problem">maximum flow</a> problem on a <a href="https://en.wikipedia.org/wiki/Bipartite_graph">bipartite graph</a>. I created the flow chart above to visualize the 3 test cases. The virtual judge run time was 0.18s.

<h3>Problem</h3>
<div style="position: relative; padding-bottom: 100%; height: 0; overflow: hidden;">
  <iframe src="https://onlinejudge.org/external/110/11045.pdf" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;"  webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>
</div>

<h3>Solution </h3>

```Java
/* * * * * * * *
Tristan Madden
2018-05-01
https://onlinejudge.org/index.php?option=com_onlinejudge&Itemid=8&page=show_problem&problem=1986
* * * * * * * * */

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.Queue;
public class Main {
    static int source = 0;
    static int sink = 1;
    static HashMap<String, Integer> map = new HashMap<>(6);
    public static void main(String[] args) throws IOException {
        map.put("XS", 2);
        map.put("S", 3);
        map.put("M", 4);
        map.put("L", 5);
        map.put("XL", 6);
        map.put("XXL", 7);
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        int testCases = Integer.parseInt(br.readLine());
        while (testCases-- > 0) {
            String[] nm = br.readLine().split(" ");
            //N is multiple of 6, 1 ≤ N ≤ 36
            int N = Integer.parseInt(nm[0]);
            //M, 1 ≤ M ≤ 30, indicates the number of volunteers, with N ≥ M
            int M = Integer.parseInt(nm[1]);
            /* * * * * * * * * * * * * * * * * * * * *
            |* The size of the graph will be the sum of: 
            |* -the number of shirt sizes available (6)
            |* -the number of volunteers (M)
            |* -the sink and source (2)
            |* * * * * * * * * * * * * * * * * * * * */
            MyGraph graph = new MyGraph(M + 8);
            /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            |* S T E P   O N E
            |* Construct the edges from the source node to the t-shirt nodes.
            |* The capacity of these edges will be N/6, or the number of t-shirts
            |* in stock of this size.
            |* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
            int t;
            for (t = 0; t < 6; t++) {
                graph.addEdge(source, t + 2, N / 6);
            }
            /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            |* S T E P   T W O
            |* Construct the edges from the t-shirt nodes to the volunteer nodes.
            |* This is the bipartite graph.
            |* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
            int i, a, b;
            for (i = 0; i < M; i++) {
                String[] sizes = br.readLine().split(" ");
                a = map.get(sizes[0]);
                b = map.get(sizes[1]);
                graph.addEdge(a, i + 8, 1);
                graph.addEdge(b, i + 8, 1);
            }
            /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            |* S T E P   T H R E E
            |* Construct the edges from the volunteer nodes to the sink node.
            |* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
            int v;
            for (v = 0; v < M; v++) {
                graph.addEdge(v + 8, sink, 1);
            }
            /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            |* S T E P   F O U R
            |* Run Max Flow on the bipartite graph.
            |* If the maximum flow is equal to the number of volunteers, print
            |* "YES". Otherwise, print "NO".
            |* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
            if (graph.maxFlow(source, sink) == M) {
                System.out.println("YES");
            } else {
                System.out.println("NO");
            }
        }
    }
}
class MyGraph {
    int size;
    int[][] edges;
    MyGraph(int _size) {
        this.size = _size;
        this.edges = new int[size][size];
    }
    void addEdge(int x, int y, int weight) {
        edges[x][y] += weight;
    }
    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    |* M A X   F L O W
    |* This is a franken-method pieced together from other solution I found 
    |* online. Pretty much treating it as a black box. 
    |* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    int maxFlow(int source, int sink) {
        int[] prev = new int[size];
        int answer = 0;
        int mincut = Integer.MAX_VALUE; //infinity
        while (true) {
            Queue<Integer> q = new LinkedList<>();
            q.add(source);
            Arrays.fill(prev, -1);
            while (!q.isEmpty() && prev[sink] == -1) {
                int u = q.remove();
                for (int v = 0; v < size; v++) {
                    if (v != source && prev[v] == -1 && edges[u][v] > 0) {
                        q.add(v);
                        prev[v] = u;
                    }
                }
            }
            if (prev[sink] == -1) {
                break;
            }
            int y = sink;
            int x = prev[y];
            while (x != -1) {
                mincut = Math.min(mincut, edges[x][y]);
                y = x;
                x = prev[y];
            }
            int v = sink;
            int u = prev[v];
            while (u != -1) {
                edges[u][v] -= mincut;
                edges[v][u] += mincut;
                v = u;
                u = prev[v];
            }
            answer += mincut;
        }
        return answer;
    }
}
```