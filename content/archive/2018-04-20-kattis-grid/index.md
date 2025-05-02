---
title: Kattis Challenge "Grid"
author: Tristan Madden
categories: [Java]
draft: false
tags: [kattis, coding challenge]
date: 2018-04-28
summary: Solved using a non-recursive version of BFS. Runs in pretty good time.
usePageBundles: true
thumbnail: "thumbnail.png"

---
Solved using a non-recursive version of <a href="https://en.wikipedia.org/wiki/Breadth-first_search">BFS</a>. Runs in pretty good time.

## Problem
<div style="position: relative; padding-bottom: 100%; height: 0; overflow: hidden;">
  <iframe src="https://open.kattis.com/problems/grid" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;"  webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>
</div>

## My Solution

```Java
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.LinkedList;
import java.util.Queue;
class Kattis_Grid {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String[] temp = br.readLine().split(" ");
        int rows = Integer.parseInt(temp[0]);
        int cols = Integer.parseInt(temp[1]);
        /*
        This program uses 1D arrays instead of 2D arrays to enhance 
        performance at the cost of readability. This entire program will be
        micro-optimized to death.
         */
        int[] distance = new int[rows * cols];
        int[] grid = new int[rows * cols];
        /*
        Read a line as a String and store it as a character array. Subtracting 
        48 from the ASCII representation of a number will give you its decimal 
        value. This nested loop also sets the entire distance array to -1 to 
        represent that cell of the grid as being unvisited.
         */
        for (int x = 0; x < rows; x++) {
            char[] temp2 = br.readLine().toCharArray();
            for (int y = 0; y < cols; y++) {
                grid[y + cols * x] = (temp2[y] - 48);
                distance[y + cols * x] = -1;
            }
        }
        //This is the starting point.
        distance[0] = 0;
        /*
        The non-recursive implementation of BFS uses a queue (First In First Out)
        instead of a stack (First In Last Out). It checks whether a Node has 
        been discovered before enqueueing the Node rather than delaying this 
        check until the Node is dequeued from the queue.
         */
        Queue<int[]> queue = new LinkedList<>();
        /*
        I'm using a two-digit integer array in lieu of a "Node" object to shave 
        off some run time.
         */
        queue.add(new int[]{0, 0});
        int x, y, newX, newY;
        int[] current;
        while (!queue.isEmpty()) {
            //As we leave a Node we dequeue it.
            current = queue.remove();
            x = current[0];
            y = current[1];
            //Micro-optimization that saves the program one needless loop.
            if (x == rows - 1 && y == cols - 1) {
                break;
            }
            int direction = 0;
            //Check every cardinal direction.
            while (direction++ < 4) {
                switch (direction) {
                    //Up
                    case 1:
                        newX = x;
                        newY = y + grid[x * cols + y] * -1;
                        break;
                    //Down
                    case 2:
                        newX = x;
                        newY = y + grid[x * cols + y] * 1;
                        break;
                    //Left
                    case 3:
                        newX = x + grid[x * cols + y] * -1;
                        newY = y;
                        break;
                    //Right
                    case 4:
                        newX = x + grid[x * cols + y] * 1;
                        newY = y;
                        break;
                    default:
                        newX = 0;
                        newY = 0;
                        break;
                }
                /*
                Check if the direction you've moved in is within the bounds
                of the grid. If the node is within bounds,
                 */
                if (newX >= 0 && newX < rows && newY >= 0 && newY < cols) {
                    // and the node is unvisited,
                    if (distance[newX * cols + newY] == -1) {
                        // add it to the queue and update the distance matrix.
                        queue.add(new int[]{newX, newY});
                        distance[newX * cols + newY] = distance[x * cols + y] + 1;
                    }
                }
            }
        }
        /*
        Print the distance value of the bottom-right cell because that is the
        final destination in this problem.
         */
        System.out.print(distance[(rows - 1) * cols + (cols - 1)]);
    }
}
```