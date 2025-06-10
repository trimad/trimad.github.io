---
title: Sieve of Eratosthenes
author: Tristan Madden
date: 2017-10-17
draft: false
tags: [assembly, prime numbers]
categories: [MASM]
summary: "An x86 MASM implementation of the Sieve of Eratosthenes algorithm that finds and counts prime numbers up to a given value n, translated from Java to assembly language."
toc: true
usePageBundles: true
---
This is my first attempt a prime sieve in assembly. It is largely a direct translation from a Sieve of Eratosthenes originally written in Java, so this program is not exactly optimally structured. Firstly, it stores all primes up to n in an array. Secondly, it counts the number of primes before n and stores that hexadecimal value in the EAX register. This is rough. There is much room for improvement, and I intend to revisit this program without using the MUL function. 
<script src="https://gist.github.com/Trimad/d5408dfe112176dd5b40cb0b761d7b0f.js"></script>