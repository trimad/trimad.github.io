---
author: Tristan Madden
categories: [powershell]
date: 2025-12-03
draft: false
tags: [entra, microsoft graph, signin, security]
title: "Query Successful Sign-ins With Microsoft Graph"
summary: "A quick PowerShell script that pulls successful sign-ins from Entra ID using Microsoft Graph."
usePageBundles: true
toc: false
---

I threw together a small script for quickly auditing successful sign-ins originating from New York. It uses the Microsoft Graph PowerShell SDK, pulls the last X days of logs, filters for success (`errorCode 0`), then narrows the results down to New York by city or state.

The output is shaped into a cleaner object and exported to `NewYorkSuccessfulSignIns.json` in the working directory. If nothing matches, it still writes an empty JSON array so downstream tooling doesn't explode.

Scopes needed:

- `AuditLog.Read.All`
- `Directory.Read.All`

Handy for quick investigations, suspicious activity reviews, or validating geographic access patterns. Just adjust the city/state or change the `$daysBack` value if you want to expand the search window.

```powershell
<#
.SYNOPSIS
Collects successful sign-ins from New York and exports
them to a formatted JSON file.

.DESCRIPTION
This script connects to Microsoft Graph, retrieves sign-in
logs for the last X days, filters for successful sign-ins
originating from New York (by city or state), and exports
them to NewYorkSuccessfulSignIns.json for review/auditing.

Prereqs:
- Microsoft Graph PowerShell SDK
- Entra ID P1/P2 + AuditLog.Read.All permission
#>

Write-Host "`n=== Entra ID Sign-In Collector (New York) ===`n" -ForegroundColor Cyan

# --- STEP 1: Connect to Microsoft Graph ---
$requiredScopes = @(
    "AuditLog.Read.All",   # read sign-in logs
    "Directory.Read.All"
)

try {
    Write-Host "Connecting to Microsoft Graph..." -ForegroundColor Yellow
    Connect-MgGraph -Scopes $requiredScopes -NoWelcome -ErrorAction Stop
    Write-Host "✅ Connected successfully.`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to connect to Microsoft Graph: $_" -ForegroundColor Red
    exit
}

# --- STEP 2: Define time range and location filter ---
# How many days back to look
$daysBack = 7

$startDate = (Get-Date).AddDays(-$daysBack).ToUniversalTime().ToString("s") + "Z"
$filter = "createdDateTime ge $startDate and status/errorCode eq 0"  # successful sign-ins only

# Location filter (change as needed)
$targetCity  = "New York"
$targetState = "New York"

Write-Host "Retrieving successful sign-ins since $startDate..." -ForegroundColor Yellow

# --- STEP 3: Retrieve sign-ins from Graph ---
try {
    # Server-side filter on date + success, client-side filter on location
    $allSignIns = Get-MgAuditLogSignIn -All -Filter $filter
} catch {
    Write-Host "❌ Failed to retrieve sign-in logs: $_" -ForegroundColor Red
    Disconnect-MgGraph -Confirm:$false
    exit
}

if (-not $allSignIns) {
    Write-Host "❌ No sign-ins found for the specified time range." -ForegroundColor Red
    Disconnect-MgGraph -Confirm:$false
    exit
}

Write-Host ("Retrieved {0} total successful sign-ins." -f $allSignIns.Count) -ForegroundColor Green

# --- STEP 4: Filter sign-ins to New York (city or state) ---
Write-Host "Filtering sign-ins to those originating from New York..." -ForegroundColor Yellow

$nySignIns = $allSignIns | Where-Object {
    $_.Location -and (
        $_.Location.City  -eq $targetCity  -or
        $_.Location.State -eq $targetState
    )
}

if (-not $nySignIns) {
    Write-Host "⚠️ No successful sign-ins found from New York for this period." -ForegroundColor Yellow
}

Write-Host ("Found {0} successful sign-ins from New York.`n" -f $nySignIns.Count) -ForegroundColor Green

# --- STEP 5: Shape output into a friendly object ---
$results = $nySignIns | Select-Object `
    CreatedDateTime,
    UserDisplayName,
    UserPrincipalName,
    IPAddress,
    ClientAppUsed,
    ResourceDisplayName,
    AuthenticationRequirement,
    ConditionalAccessStatus,
    @{ Name = "City";             Expression = { $_.Location.City } },
    @{ Name = "State";            Expression = { $_.Location.State } },
    @{ Name = "CountryOrRegion";  Expression = { $_.Location.CountryOrRegion } },
    @{ Name = "StatusErrorCode";  Expression = { $_.Status.ErrorCode } },
    @{ Name = "StatusFailureReason"; Expression = { $_.Status.FailureReason } }

# --- STEP 6: Export results to JSON ---
$outputFile = Join-Path (Get-Location) "NewYorkSuccessfulSignIns.json"

if (-not $results -or $results.Count -eq 0) {
    Write-Warning "No New York sign-ins found; writing empty JSON array."
    "[]" | Out-File -FilePath $outputFile -Encoding utf8
} else {
    $results | ConvertTo-Json -Depth 5 | Out-File -FilePath $outputFile -Encoding utf8
    Write-Host ("`n✅ Exported {0} New York sign-ins to {1}" -f $results.Count, $outputFile) -ForegroundColor Green
}

# --- STEP 7: Open the file automatically ---
Start-Process $outputFile

# --- STEP 8: Clean up session ---
#Disconnect-MgGraph -Confirm:$false
Write-Host "`nSession disconnected. All done!`n" -ForegroundColor Cyan
```