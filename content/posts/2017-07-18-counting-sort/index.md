---
author: Tristan Madden
date: 2017-07-18
draft: false
tags: [sorting, counting sort]
categories: [Java, Processing]
summary: "A Java implementation of the counting sort algorithm, a non-comparison based sorting method with O(n+k) time complexity, demonstrated using Processing."
toc: true
usePageBundles: true
---

Counting sort is a non-comparison based sorting algorithm that works by determining, for each element in an input array, the number of elements that are less than it. This information is then used to place the element in its correct position in the output array. The algorithm has a linear time complexity of O(n+k), where n is the number of elements in the input array and k is the range of values in the input array.

```Java
//int [] A = {2, 5, 3, 0, 2, 3, 0, 3};
int [] A = {6, 0, 2, 0, 1, 3, 4, 6, 1, 3, 2};
int []B = new int[A.length];

void setup() {
  countingSort(A);
  noLoop();
}

void countingSort(int arr[]) {

  int k = arr.length;

  // The output character array that will have sorted arr
  int output[] = new int[k];

  // Create a count array to store count of inidividual
  // characters and initialize count array as 0
  int count[] = new int[256];
  for (int i=0; i<256; ++i)
    count[i] = 0;

  // store count of each character
  for (int i=0; i<k; ++i) {
    ++count[arr[i]];
    print(count[i]);
  }
  // Change count[i] so that count[i] now contains actual
  // position of this character in output array
  for (int i=1; i<=255; ++i) {
    count[i] += count[i-1];
  }
  println("");
  // Build the output character array
  for (int i = 0; i<k; ++i)
  {
    output[count[arr[i]]-1] = arr[i];
    print(output[i]);
    --count[arr[i]];
  }
  println("");
  // Copy the output array to arr, so that arr now
  // contains sorted characters
  for (int i = 0; i<k; ++i) {
    arr[i] = output[i];
    print(output[i]);
  }
}
```
