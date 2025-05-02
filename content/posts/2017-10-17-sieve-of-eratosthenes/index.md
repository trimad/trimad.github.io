---
title: Sieve of Eratosthenes
author: Tristan Madden
categories: [MASM]
tags: [assembly, prime numbers]
date: 2017-10-17
lastmod: 2023-03-10
thumbnail: "thumbnail.png"
usePageBundles: true
summary: "This is my first attempt a prime sieve in assembly. It is largely a direct translation from a Sieve of Eratosthenes originally written in Java, so this program is not exactly optimally structured. Firstly, it stores all primes up to n in an array. Secondly, it counts the number of primes before n and stores that hexadecimal value in the EAX register. This is rough. There is much room for improvement, and I intend to revisit this program without using the MUL function. "
---
This is my first attempt a prime sieve in assembly. It is largely a direct translation from a Sieve of Eratosthenes originally written in Java, so this program is not exactly optimally structured. Firstly, it stores all primes up to n in an array. Secondly, it counts the number of primes before n and stores that hexadecimal value in the EAX register. This is rough. There is much room for improvement, and I intend to revisit this program without using the MUL function. 
<script src="https://gist.github.com/Trimad/d5408dfe112176dd5b40cb0b761d7b0f.js"></script>