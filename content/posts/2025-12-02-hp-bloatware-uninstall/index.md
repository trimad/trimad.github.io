---
author: Tristan Madden
categories: [PowerShell]
date: 2025-12-02
draft: false
tags: [automation]
title: "HP Bloatware Uninstaller"
summary: "The perfect PowerShell script for uninstalling HP bloatware."
usePageBundles: true
toc: false
---

I put together a quick script to purge all HP software (including Wolf Security junk) by scraping the registry’s uninstall keys. It grabs both 64-bit and WOW6432Node entries, filters anything with HP or Wolf in the name, and silently uninstalls each one.

The tricky part is normalizing the uninstall commands—HP mixes MSI GUID calls with random EXE installers, sometimes wrapped in quotes, sometimes not. The script fixes all of that and calls each uninstall silently with `/quiet` and `/norestart`.

Simple, fast, and perfect for cleaning vendor images or prepping machines for deployment. Just run it elevated and let it rip.

```powershell
# Remove all HP software using registry uninstall strings
$hpApps = Get-ItemProperty `
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*" ,
    "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*" |
    Where-Object { 
        ($_.Publisher -like "*HP*") -or 
        ($_.DisplayName -like "HP*") -or 
        ($_.DisplayName -like "*Wolf*")
    }
 
foreach ($app in $hpApps) {
    if ($app.DisplayName -and $app.UninstallString) {
 
        Write-Host "Uninstalling: $($app.DisplayName)" -ForegroundColor Cyan
        
        # Fix uninstall command formatting
        $cmd = $app.UninstallString
 
        # Some uninstall strings are like: "C:\Program Files\HP\Installer.exe" /uninstall
        # Others are like: msiexec /x {GUID}
        if ($cmd -match "msiexec") {
            $cmd = "$cmd /qn /norestart"
        } elseif ($cmd -match '^"') {
            # If EXE with quotes, wrap properly
            $cmd = "$cmd /quiet /norestart"
        } else {
            $cmd = "`"$cmd`" /quiet /norestart"
        }
 
        Start-Process cmd.exe "/c $cmd" -Wait -ErrorAction SilentlyContinue
    }
}
```
