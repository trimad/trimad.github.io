
---
author: Tristan Madden
categories: [Shell]
date: 2024-03-22
#lastmod: 2024-07-03
draft: false
featured: true
summary: "Comprehensive guide on changing DNS settings remotely and locally, with a focus on network troubleshooting and management."
tags: [Networking, DNS, Windows, PowerShell, Command Line]
thumbnail: "thumbnail.png"
title: "Mastering DNS Configuration: Remote and Local Techniques"
toc: true
usePageBundles: true
---

This guide provides comprehensive steps for managing DNS configurations, both remotely and locally. It's particularly useful for resolving network issues caused by incorrect DNS settings.

## Remote DNS Configuration

When you need to change DNS settings on a remote machine, you can use the following commands. In these examples, we'll use a computer with the hostname "HOSTNAME" and set Google's DNS (8.8.8.8) as the primary and Cloudflare's DNS (1.1.1.1) as the secondary.

### Using WMIC from Command Prompt

```shell
# List network adapters
wmic /node:"HOSTNAME" nicconfig get Description, SettingID, IPEnabled

# Set primary DNS (replace SettingID with the actual ID from the previous command)
wmic /node:"HOSTNAME" nicconfig where SettingID='{4C2E5961-1B25-4AE9-852C-0A285E891244}' call SetDNSServerSearchOrder ("8.8.8.8")

# Set both primary and secondary DNS
wmic /node:"HOSTNAME" nicconfig where SettingID='{4C2E5961-1B25-4AE9-852C-0A285E891244}' call SetDNSServerSearchOrder ("8.8.8.8", "1.1.1.1")
```

### Using PowerShell

```powershell
# Check current DNS settings
Get-WmiObject -Class Win32_NetworkAdapterConfiguration -ComputerName HOSTNAME -Filter "IPEnabled = True" | Select-Object -Property Description, DNSServerSearchOrder

# Set DNS servers
$adapter = Get-WmiObject -Class Win32_NetworkAdapterConfiguration -ComputerName HOSTNAME -Filter "IPEnabled = True"
$adapter.SetDNSServerSearchOrder(@("8.8.8.8", "1.1.1.1"))
```

## Local DNS Configuration

For local DNS management, netsh commands are particularly useful. Here are various scenarios and their corresponding commands:

### View All Network Interfaces

Use `netsh` to list all network interfaces:

```shell
netsh interface ipv4 show interfaces
```

### View Current DNS Settings
```shell
netsh interface ipv4 show dns "Wi-Fi"
```

### Set Primary and Secondary DNS

```shell
netsh interface ipv4 set dns name="Wi-Fi" static 8.8.8.8
netsh interface ipv4 add dns name="Wi-Fi" 1.1.1.1
```

### Remove a Specific DNS Server

```shell
netsh interface ipv4 delete dns name="Wi-Fi" addr=1.1.1.1
```

### Reset to DHCP (Automatic DNS)

```shell
netsh interface ipv4 set dns name="Wi-Fi" source=dhcp
```

### Display All DNS Settings

```shell
ipconfig /all | findstr "DNS"
```

### View and Modify Hosts File

```shell
notepad C:\Windows\System32\drivers\etc\hosts
```

### Reset Network Stack

If you're experiencing persistent network issues, you can try resetting the entire network stack:

```shell
netsh winsock reset && netsh int ip reset && ipconfig /release && ipconfig /renew && ipconfig /flushdns
```
