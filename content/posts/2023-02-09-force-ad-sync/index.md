---
author: Tristan Madden
categories: [PowerShell]
date: 2023-02-09
tags: [Azure, M365]
title: Force domain controller to sync with AzureAD
summary: PowerShell script that forces an AD sync with AzureAD
usePageBundles: true
thumbnail: "thumbnail.png"
---
This PowerShell script performs the following actions:

1. It retrieves the Windows identity and security principal of the current user account.
2. It then retrieves the security principal for the Administrator role.
3. It checks if the current user is running as an administrator. If the user is not running as an administrator, the script relaunches itself as an elevated process.
4. If the user is running as an administrator, the script displays a menu with three options: "Delta Sync", "Full Sync", and "Exit". The user is prompted to select an option by entering the corresponding number.
5. Based on the user's selection, the script runs the appropriate command using the Start-ADSyncSyncCycle cmdlet with either the Delta or Initial policy type. If the user selects "Exit", the script exits.
5. Finally, the script displays a message indicating that it is running and to check the "miisclient" to confirm. It then pauses for 10 seconds using the Start-Sleep cmdlet.

```PowerShell
$myWindowsID = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$myWindowsPrincipal = New-Object System.Security.Principal.WindowsPrincipal($myWindowsID)
$adminRole = [System.Security.Principal.WindowsBuiltInRole]::Administrator

if (-not $myWindowsPrincipal.IsInRole($adminRole)) {
    $newProcess = New-Object System.Diagnostics.ProcessStartInfo "PowerShell"
    $newProcess.Arguments = $myInvocation.MyCommand.Definition
    $newProcess.Verb = "runas"
    [System.Diagnostics.Process]::Start($newProcess)
    exit
}

Write-Host '1) Delta Sync (Recommended, unless told to do a full sync)'
Write-Host '2) Full Sync'
Write-Host '3) Exit'

$selected_menu_item = Read-Host 'Which number would you like to run (1 or 2)? (Enter Number and Press Enter)'

switch ($selected_menu_item) {
    1 { Start-ADSyncSyncCycle -PolicyType Delta }
    2 { Start-ADSyncSyncCycle -PolicyType Initial }
    3 { Write-Host 'Exit'; exit }
    default { Write-Host 'Incorrect Input' -ForegroundColor Red }
}

Write-Host 'Running Now.... Check miisclient to confirm'
Start-Sleep -s 10
```