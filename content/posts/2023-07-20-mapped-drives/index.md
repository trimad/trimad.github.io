---
author: Tristan Madden
categories: [shell, powershell]
date: 2023-07-20
lastmod: 2023-07-21
featured: false
summary: "This blog post discusses a PowerShell script that can map a network drive using a Security Identifier (SID), even without being logged in as that user."
tags: [PowerShell, network drives, SID, registry modification]
thumbnail: "thumbnail.png"
title: Mapping Network Drives Using PowerShell and SID
toc: true
usePageBundles: true
---

In this post, I'll walk you through the process of mapping a network drive using PowerShell and a Security Identifier (SID), which uniquely identifies a user in Windows. The primary benefit of this method is that it allows you to perform the operation without being logged in as the specific user.

## PowerShell Script

```PowerShell
# Variables
$networkDriveLetter = "Z:"
$networkPath = "\\servername\sharename"
$userSID = "S-1-5-21-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxx-xxxx" # Replace with the user's SID
$netUseKeyPath = "Registry::\HKEY_USERS\$userSID\Network\$($networkDriveLetter.TrimEnd(':'))"

# Check if network drive registry key already exists
if(Test-Path -Path $netUseKeyPath) {
    Write-Host "The network drive is already mapped in the registry."
} else {
    # Create new registry keys for mapping network drive
    New-Item -Path $netUseKeyPath -Force
    New-ItemProperty -Path $netUseKeyPath -Name RemotePath -Value $networkPath -PropertyType String -Force
    New-ItemProperty -Path $netUseKeyPath -Name UserName -Value "" -PropertyType String -Force # Empty, as this will use the user's current logon credentials
    New-ItemProperty -Path $netUseKeyPath -Name ProviderName -Value 'Microsoft Windows Network' -PropertyType String -Force
    New-ItemProperty -Path $netUseKeyPath -Name ConnectionType -Value 1 -PropertyType DWord -Force

    Write-Host "Network drive mapped successfully in the registry."
}

```

Please remember to replace "S-1-5-21-xxxxxxxxxx-xxxxxxxxxx-xxxxxxxxx-xxxx" with the SID of the user you're modifying the registry for.

## Obtaining the User's SID

If you're unsure about how to get the user's SID, you can use the following PowerShell command:

```PowerShell
$objUser = New-Object System.Security.Principal.NTAccount("domainname", "username")
$strSID = $objUser.Translate([System.Security.Principal.SecurityIdentifier])
$strSID.Value
```

Replace "domainname" and "username" with the respective values for your user.

Alternatively, this can be condensed into a one-liner:

```PowerShell
(New-Object System.Security.Principal.NTAccount("domainname", "username")).Translate([System.Security.Principal.SecurityIdentifier]).Value
```

## Post Mapping Procedure

Be aware that post mapping, the network drive will not be instantly accessible to the user. Visibility is only updated after the user has logged out and back in again, or after manually terminating the explorer.exe task and restarting it.