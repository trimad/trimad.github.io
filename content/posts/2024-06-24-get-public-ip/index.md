---
author: Tristan Madden
categories: [Networking, Shell, PowerShell]
date: 2024-06-24
draft: false
summary: "A collection of methods to retrieve your public IP address using command-line tools like nslookup, curl, and PowerShell, as well as web-based solutions."
tags: [networking, ip-address, command-line, powershell, curl, nslookup]
title: "How to Find Your Public IP Address"
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