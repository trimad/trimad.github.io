---
title: Mastering Time with Shell and PowerShell
author: Tristan Madden
categories: [Shell, PowerShell]
summary: "Discover an array of shell and PowerShell commands related to time management, such as checking the last boot-up time, system boot time, and changing the time zone."
tags: [time, systeminfo, wmic, Win32_OperatingSystem, tzutil]
date: 2023-02-02
lastmod: 2023-03-14
toc: true
thumbnail: "thumbnail.png"
usePageBundles: true
---

Explore an array of shell and PowerShell commands focused on time management, including last boot-up time, system boot time, and time zone adjustments.

## DATE
Display the current date using the DATE command:
```Shell
DATE /T
```

## wmic
### LastBootUpTime
Retrieve the last boot-up time using Windows Management Instrumentation Command-line (wmic):

```Shell
wmic path Win32_OperatingSystem get LastBootUpTime
```

## SystemUpTime
Determine system uptime, showing the duration since the last boot-up:

```Shell
wmic path Win32_PerfFormattedData_PerfOS_System get SystemUpTime

```
## systeminfo
### System Boot Time
Obtain the system boot time using the systeminfo command in conjunction with find:

```Shell
systeminfo | find "System Boot Time"
```

## w32tm
The w32tm command-line tool is used for diagnosing and configuring the Windows Time Service.

### configuration
Check the current configuration:
```Shell
w32tm /query /configuration
```

### Register and Unregister
Register or unregister the Windows Time Service:
```Shell
w32tm /unregister
w32tm /register
```

### resync
Resynchronize the system clock with the configured time source:
```Shell
w32tm /resync
```

###  query source
Display the current time source and related information:
```Shell
w32tm /query /source
```

## Win32_OperatingSystem
### LastBootUpTime
Calculate the time elapsed since the last boot-up in PowerShell by subtracting the LastBootUpTime from the current date:

```PowerShell
(get-date) - (gcim Win32_OperatingSystem).LastBootUpTime
```
Alternatively, execute the same command within a shell environment:

```Shell
powershell.exe -c "(get-date) - (gcim Win32_OperatingSystem).LastBootUpTime"
```

## TIME
Obtain the current system time using the TIME command with the /T flag:

```Shell
TIME /T
```

## tzutil

### Display the current time zone:
Show the current time zone:
```Shell
tzutil /g
```

### Change time zone
Change the system time zone using the tzutil command by providing the desired time zone as an argument after the /s flag. For example, set the time zone to Eastern Standard Time:

```Shell
tzutil /s "Eastern Standard Time"
```