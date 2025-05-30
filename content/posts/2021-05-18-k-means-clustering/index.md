---
title: k-means Clustering
author: Tristan Madden
date: 2021-05-18
draft: false
tags: [animation, k-means]
categories: [Java, Processing]
summary: "A Processing visualization of the k-means clustering algorithm, demonstrating iterative centroid-based data partitioning and Voronoi cell formation for different values of k."
toc: true
usePageBundles: true
---

_k-means clustering_ is a method of vector quantization, originally from signal processing, that aims to partition n observations into k clusters in which each observation belongs to the cluster with the nearest mean (cluster centers or cluster centroid), serving as a prototype of the cluster. This results in a partitioning of the data space into Voronoi cells.

{{< figure src="ZWxy72b.gif" alt="K=2" >}}

{{< figure src="YM1LT77.gif" alt="K=3" >}}

{{< figure src="2a4rs4L.gif" alt="K=4" >}}

{{< figure src="IY8X6gJ.gif" alt="K=5" >}}

GitHub repository: https://github.com/Trimad/k-means-clustering