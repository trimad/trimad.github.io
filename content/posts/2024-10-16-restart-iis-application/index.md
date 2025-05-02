---
author: Tristan Madden
categories: [PowerShell]
date: 2024-10-16
draft: true
tags: [IIS]
title: Restart IIS Application Pools with PowerShell
thumbnail: "thumbnail.png"
summary: A PowerShell script I put together to stop and start an IIS application pool, with logging.
usePageBundles: true
---

## The Script

What the script does:

1. Logs the initial state of the app pool.
2. Logs details about the worker processes before stopping the app pool.
3. Increases the shutdown time limit to give more control.
4. Stops and restarts the app pool, logging how long it takes and any errors.
5. Logs worker process details after the app pool is restarted.

```PowerShell
$AppPoolName = "App"
$LogFilePath = "C:\Scripts\Logs\App.txt"
 
Import-Module WebAdministration
 
# Function to log messages with a timestamp
function Write-Log {
    param (
        [string]$Message
    )
    $timestamp = Get-Date
    $formattedMessage = "$timestamp - $Message"
    Add-Content -Path $LogFilePath -Value $formattedMessage
}
 
# Log initial state of the application pool
$initialState = (Get-WebAppPoolState -Name $AppPoolName).Value
Write-Log "Initial state of Application Pool '$AppPoolName': $initialState"
 
# Log worker process details before stopping (if available)
$preStopProcesses = Get-WmiObject Win32_Process | Where-Object {
    $_.CommandLine -match $AppPoolName -and $_.Name -eq "w3wp.exe"
}
if ($preStopProcesses) {
    foreach ($process in $preStopProcesses) {
        Write-Log "Pre-stop Process ID: $($process.ProcessId), Memory Usage: $([math]::Round($process.WorkingSetSize/1MB, 2)) MB"
    }
} else {
    Write-Log "No running worker processes found for '$AppPoolName'."
}
 
# Increase the shutdown time limit to 300 seconds (5 minutes)
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name "shutdownTimeLimit" -Value "00:05:00"
 
# Attempt to stop the application pool and log shutdown duration
try {
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    Stop-WebAppPool -Name $AppPoolName
    $stopwatch.Stop()
    Write-Log "Stopped Application Pool '$AppPoolName' in $($stopwatch.Elapsed.TotalSeconds) seconds."
} catch {
    Write-Log "Error stopping Application Pool '$AppPoolName': $_"
}
 
# Log state after stopping
$postStopState = (Get-WebAppPoolState -Name $AppPoolName).Value
Write-Log "State of Application Pool '$AppPoolName' after stop command: $postStopState"
 
# Start the application pool
try {
    Start-WebAppPool -Name $AppPoolName
    Write-Log "Started Application Pool '$AppPoolName' successfully."
} catch {
    Write-Log "Error starting Application Pool '$AppPoolName': $_"
}
 
# Log state after starting
$finalState = (Get-WebAppPoolState -Name $AppPoolName).Value
Write-Log "Final state of Application Pool '$AppPoolName' after start command: $finalState"
 
# Log worker process details after starting
$postStartProcesses = Get-WmiObject Win32_Process | Where-Object {
    $_.CommandLine -match $AppPoolName -and $_.Name -eq "w3wp.exe"
}
if ($postStartProcesses) {
    foreach ($process in $postStartProcesses) {
        Write-Log "Post-start Process ID: $($process.ProcessId), Memory Usage: $([math]::Round($process.WorkingSetSize/1MB, 2)) MB"
    }
} else {
    Write-Log "No running worker processes found for '$AppPoolName' after start."
}
```

## Explanation

1. **Logging Functionality**: The `Write-Log` function just logs messages to a file with a timestamp. It keeps track of what’s going on when things start and stop.

2. **Managing App Pool State**: The script uses `Get-WebAppPoolState`, `Stop-WebAppPool`, and `Start-WebAppPool` cmdlets from the `WebAdministration` module.

3. **Worker Process Details**: I use `Get-WmiObject` to grab info about the worker processes (`w3wp.exe`) tied to the app pool. It logs process IDs and memory usage before stopping and after starting the app pool.

4. **Shutdown Time Limit**: Bumping the shutdown time limit to 300 seconds gives ongoing requests a better chance to finish before the app pool shuts down.