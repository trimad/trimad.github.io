---
title: Combining PowerShell Cmdlets
author: Tristan Madden
categories: [PowerShell]
tags: [azure, reports, active directory, ExchangeOnlineManagement]
date: 2021-11-17
thumbnail: "thumbnail.png"
usePageBundles: true
---

I found myself in a situation where I needed to generate a report to troubleshoot an email issue for a client. Some data could only be retrieved from the <a href="https://docs.microsoft.com/en-us/powershell/exchange/exchange-online-powershell-v2?view=exchange-ps">ExchangeOnlineManagement</a> module, and other data only from the <a href="https://docs.microsoft.com/en-us/powershell/module/azuread/?view=azureadps-2.0">AzureAD</a> module. This PowerShell script demonstrates one solution of using both modules in tandem with a nested for-loop that compares the UserPrincipalName with every iteration.

<script src="https://gist.github.com/Trimad/23d1f60c518fda9b4265edfe0456d8d9.js"></script>