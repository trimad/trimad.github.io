---
author: Tristan Madden
categories: [PowerShell]
date: 2024-01-02
draft: false
summary: "Steps to take when N-Central's Take Control remote access feature isn't working, including how to restart the necessary services."
tags: [powershell, n-central, remote-access, troubleshooting, system-administration]
title: "Troubleshooting N-Central Take Control"
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

## Clean Reinstall

If the aforementioned services do not exist, a clean reinstall is appropriate. 

1. In the NCentral interface, click on the device. Then click Remote Control Settings and uncheck the box next to "Install Take Control". 
2. Delete every folder in `%programdata%` that looks like: `GetSupportService_N-Central`
3. Delete every folder in `C:\Program Files (x86)` that looks like `BeAnywhere Support Express`
4. Check the box next to "Install Take Control" in Remote Control Settings.
5. Wait 5 minutes. if it still doesn't show up, open the device page in NCentral, select "ADD TASK" at the top and click on "Reinstall Agent".