---
title: Enable AutoAdminLogon with PowerShell
author: Tristan Madden
categories: [PowerShell]
tags: [regedit, domain]
date: 2019-08-19
lastmod: 2025-04-09
summary: "This script was written to satisfy a niche case where I temporarily needed a PoS (Point of Sale) to automatically login upon startup using AD credentials."
thumbnail: "thumbnail.png"
usePageBundles: true
---

This script was written to satisfy a niche case where I temporarily needed a PoS (Point of Sale) to automatically login upon startup using AD credentials.

## PowerShell Script

```powershell
# Enable AutoAdminLogon with PowerShell
$RegPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"

Set-ItemProperty -Path $RegPath -Name "AutoAdminLogon" -Value "1"
Set-ItemProperty -Path $RegPath -Name "DefaultDomainName" -Value "YOURDOMAIN"
Set-ItemProperty -Path $RegPath -Name "DefaultUserName" -Value "YOURUSERNAME"
Set-ItemProperty -Path $RegPath -Name "DefaultPassword" -Value "YOURPASSWORD"

# Optional: to disable Ctrl+Alt+Del requirement
Set-ItemProperty -Path $RegPath -Name "DisableCAD" -Value "1"
```

> **Note:** Replace `YOURDOMAIN`, `YOURUSERNAME`, and `YOURPASSWORD` with the appropriate values for your environment.

## Lock the Screen at Startup

If you need the machine to automatically log in but lock the screen immediately afterward, you can use a scheduled task that runs at logon.

### Steps to Create the Scheduled Task

1. Open **Task Scheduler**.
2. Click **Create Task**.
3. Under the **General** tab:
   - Name it something like `Lock Screen on Startup`.
   - Choose **Run whether user is logged on or not**.
   - Check **Run with highest privileges**.
4. Under the **Triggers** tab:
   - Click **New**.
   - Set **Begin the task** to `At log on`.
   - Choose **Any user** (or a specific user, if needed).
5. Under the **Actions** tab:
   - Click **New**.
   - Action: `Start a program`
   - Program/script: `rundll32.exe`
   - Add arguments: `user32.dll,LockWorkStation`
6. Click OK and enter credentials if prompted.

Now, every time the system logs in automatically, it will immediately lock the workstation.
