---
author: Tristan Madden
categories: [Group Policy]
date: 2024-05-30
draft: true
featured: false
summary: "Useful steps for troubleshooting GPO's."
tags: [Group Policy]
thumbnail: "thumbnail.png"
title: "User Lockout Report"
toc: true
usePageBundles: true
---

## DCDIAG

Test DNS
```shell
dcdiag /test:dns > out.txt
```