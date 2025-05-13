---
author: Tristan Madden
categories: [Windows, Active Directory]
date: 2024-05-31
draft: false
summary: "A collection of useful commands and steps for troubleshooting Group Policy Objects (GPOs) in a Windows Active Directory environment."
tags: [windows, active-directory, group-policy, troubleshooting, system-administration]
title: "Troubleshooting Group Policy Objects (GPOs)"
toc: true
usePageBundles: true
---

## DCDIAG

Test DNS
```shell
dcdiag /test:dns > out.txt
```