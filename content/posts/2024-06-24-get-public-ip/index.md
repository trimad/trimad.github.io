---
author: Tristan Madden
categories: [Shell, PowerShell]
date: 2024-06-25
draft: false
featured: false
summary: "Different methods of obtaining the public IP address of a computer."
tags: [ip]
thumbnail: "thumbnail.png"
title: "Get Public IP"
toc: true
usePageBundles: true
---

Different methods of obtaining the public IP address of a computer.

## Using nslookup
```Shell
nslookup myip.opendns.com. resolver1.opendns.com
```

## Using curl
```Shell
curl ifconfig.me
```

## Using PowerShell
```PowerShell
(Invoke-WebRequest -Uri "http://ifconfig.me/ip").Content
```

## Using a browser
[https://ip.me/](https://ip.me/)