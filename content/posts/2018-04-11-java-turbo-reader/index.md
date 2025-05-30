---
title: Faster Java String Inputs
author: Tristan Madden
date: 2018-04-11
draft: false
tags: [string]
categories: [Java]
summary: "A high-performance Java input reader class optimized for programming contests, providing fast integer and double parsing with automatic tokenization and buffering options."
usePageBundles: true
---

TurboReader is my solution to the poor input performance of Scanner. All I need from a Reader in most programming contest problems is the ability to read ints and Double, and to read them quickly. That is all this class does, and it also tokenizes those values so that I never have to address empty lines in the text input. I have two versions of this class; a buffered version and an unbuffered version. Judging from the NetBeans performance profiler, the unbuffered version is favored in cases where the program only needs to read a few ints from System.in.

<script src="https://gist.github.com/Trimad/e96bf07c966fd549a05d929f80765fb8.js"></script>