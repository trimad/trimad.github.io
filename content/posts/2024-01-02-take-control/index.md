---
author: Tristan Madden
categories: [PowerShell]
date: 2024-02-12
lastmod: 2024-03-22
draft: false
featured: true
summary: "Steps to take when Take Control isn't working."
tags: [PowerShell]
thumbnail: "thumbnail.png"
title: "Take Control"
toc: true
usePageBundles: true
---

## Restart Services

If the N_Central agent is installed but "Take Control" is unavailable, but you still have access to Shell on the computer, follow this procedure.

1. Get a list of all services
2. Filter that list to retrieve just the `SERVICE_NAME`
3. Filter the list of `SERVICE_NAME` down to services containing "N_Central"

```shell
sc query type= service | findstr "SERVICE_NAME" | findstr "N_Central"
```
If successful, you should get an output like this:
```
SERVICE_NAME: BASupportExpressSrvcUpdater_N_Central                             
SERVICE_NAME: BASupportExpressStandaloneService_N_Central
```
Then restart the services:
```shell
powershell.exe "Restart-Service -Name BASupportExpressSrvcUpdater_N_Central; Restart-Service -Name BASupportExpressStandaloneService_N_Central"
```