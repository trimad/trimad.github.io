---
author: Tristan Madden
categories: [Shell, PowerShell]
date: 2023-03-09
lastmod: 2023-03-09
summary: "Useful tools for when that got dang Windows just ain't acting right. 😤"
tags: [shell, PowerShell]
thumbnail: "thumbnail.png"
title: Windows Remediation
toc: true
usePageBundles: true
---

Useful tools for when that got dang Windows just ain't acting right. 😤

## DISM

1. This is a quick scan and will determine if the image is repairable.
```PowerShell
DISM /Online /Cleanup-Image /ScanHealth
```
2. This will check if there are any corruptions detected. Like the check health command, this will not repair any errors.
```PowerShell
DISM /Online /Cleanup-Image /CheckHealth
```
3. If there are any corrupt or missing files after performing one of the scans mentioned above, you can repair them automatically. Your computer will need to be connected to the Internet for the files to be automatically restored.
```PowerShell
DISM /Online /Cleanup-Image /RestoreHealth
```

#### ISO
There are circumstances where 
1. Download a Windows ISO from here: https://www.microsoft.com/en-us/software-download/windows10
2. Mount the ISO and navigate to sources and copy install.esd to a local directory.
3. Open a command prompt and get the index of the correct image using:
```shell
dism /Get-WimInfo /WimFile:install.esd
```
4. Take note of the index, and convert install.esd to install.wim:
```shell
dism /export-image /SourceImageFile:install.esd /SourceIndex:6 /DestinationImageFile:install.wim /Compress:max /CheckIntegrity
```


## SFC
The "sfc /scannow" command is a Windows utility used to scan system files for integrity violations and repair any issues it finds. It stands for System File Checker and can help resolve issues with missing or corrupted system files. Running this command requires administrator privileges and may take several minutes to complete.

```Shell
sfc /scannow
```

## DLL Hell

Visual Studio Runtime:

<a href="https://aka.ms/vs/17/release/vc_redist.x64.exe">vc_redist.x64.exe</a><br><br>
Permalink for latest supported x64 version. The X64 Redistributable package contains both ARM64 and X64 binaries. This package makes it easy to install required Visual C++ ARM64 binaries when the X64 Redistributable is installed on an ARM64 device.<br><br>

<a href="https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist?view=msvc-170#visual-studio-2015-2017-2019-and-2022">Source</a>

Re-register a single DLL file:

```Shell
regsvr32 "path & filename of DLL or OCX"
```

Re-register all DLL files:

```Shell
for %1 in (*.dll) do regsvr32 /s %1
```

## Windows Apps

Reinstall and re-register all Windows apps for current account only:
```PowerShell
Get-AppXPackage | Foreach {Add-AppxPackage -DisableDevelopmentMode -Register "$($_.InstallLocation)\AppXManifest.xml"}
```

Reinstall and re-register all Windows apps for <i>all accounts</i>:
```PowerShell
Get-AppXPackage -AllUsers | Foreach {Add-AppxPackage -DisableDevelopmentMode -Register "$($_.InstallLocation)\AppXManifest.xml"}
```