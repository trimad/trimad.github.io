---
author: Tristan Madden
categories: [PowerShell]
date: 2025-12-03
draft: false
tags: ["entra", "api", "signin"]
title: "Export Successful Sign-ins With Microsoft Graph"
summary: "Audit successful Entra ID sign-ins per verified domain with optional city/state filters using Microsoft Graph PowerShell."
usePageBundles: true
toc: false
---

I tightened up a small script for auditing successful Entra ID sign-ins per verified tenant domain. It uses the Microsoft Graph PowerShell SDK, pulls the last X days of logs, filters for success (`errorCode 0`), then narrows the results by city/state (defaults are Los Angeles/California) using either `OR` or `AND` matching.

Defaults you can tweak up top:

- `$daysBack = 7` lookback window
- `$targetCity` / `$targetState` (set either to `""` to ignore)
- `$locationMatchMode = "OR"` (flip to `"AND"` to require both)
- `$outputFileName = "LocationSuccessfulSignIns.json"`

It loops across verified domains, shapes the results into a cleaner object, and writes `LocationSuccessfulSignIns.json` to the working directory. If nothing matches, it still writes an empty JSON array so downstream tooling doesn't explode.

Scopes needed:

- `AuditLog.Read.All`
- `Directory.Read.All`

Handy for quick investigations, suspicious activity reviews, or validating geographic access patterns. Just adjust the city/state or change the `$daysBack` value if you want to expand the search window.

```powershell
<#
.SYNOPSIS
Collects successful Entra ID sign-ins per verified tenant domain and exports them to a formatted JSON file.
#>

Write-Host "`n=== Entra ID Sign-In Collector (Per Domain + Location Filter) ===`n" -ForegroundColor Cyan

# -----------------------------
# CONFIG
# -----------------------------
$daysBack = 7
$targetCity  = "Los Angeles"    # "" to ignore
$targetState = "California"    # "" to ignore
$locationMatchMode = "OR"
$outputFileName = "LocationSuccessfulSignIns.json"

# -----------------------------
# STEP 1: Connect to Microsoft Graph
# -----------------------------
$requiredScopes = @("AuditLog.Read.All","Directory.Read.All")

try {
    Write-Host "Connecting to Microsoft Graph..." -ForegroundColor Yellow
    Connect-MgGraph -Scopes $requiredScopes -NoWelcome -ErrorAction Stop
    Write-Host "Connected successfully.`n" -ForegroundColor Green
} catch {
    Write-Host ("Failed to connect to Microsoft Graph: {0}" -f $_) -ForegroundColor Red
    exit
}

# -----------------------------
# STEP 2: Get tenant domains (EXO-style)
# -----------------------------
Write-Host "Retrieving tenant domains..." -ForegroundColor Yellow
$domainsRaw = Get-MgDomain -All -ErrorAction Stop
$tenantDomains = $domainsRaw | Select-Object Id, IsVerified, IsDefault

Write-Host "`n=== Tenant Domains ===" -ForegroundColor Cyan
$tenantDomains | Format-Table Id, IsVerified, IsDefault

$verifiedDomains = $tenantDomains | Where-Object { $_.IsVerified } | Select-Object -ExpandProperty Id
if (-not $verifiedDomains) { throw "No verified domains found." }

# -----------------------------
# Location matcher
# -----------------------------
function Test-LocationMatch {
    param($SignIn,$City,$State,$Mode)
    if (-not $City -and -not $State) { return $true }
    if (-not $SignIn.Location) { return $false }
    $c = $City  -and $SignIn.Location.City  -eq $City
    $s = $State -and $SignIn.Location.State -eq $State
    if ($City -and $State -and $Mode -eq "AND") { return ($c -and $s) }
    return ($c -or $s)
}

# -----------------------------
# STEP 3: Retrieve sign-ins
# -----------------------------
$startDate = (Get-Date).AddDays(-$daysBack).ToUniversalTime().ToString("s") + "Z"
$filter = "createdDateTime ge $startDate and status/errorCode eq 0"

Write-Host ("Retrieving successful sign-ins since {0}..." -f $startDate) -ForegroundColor Yellow
$allSignIns = Get-MgAuditLogSignIn -All -Filter $filter -ErrorAction Stop
Write-Host ("Retrieved {0} sign-ins.`n" -f $allSignIns.Count) -ForegroundColor Green

# -----------------------------
# STEP 4: Loop per domain
# -----------------------------
$results = @()
$counter = 1

foreach ($domain in $verifiedDomains) {
    Write-Host ("[{0}/{1}] Checking {2}" -f $counter, $verifiedDomains.Count, $domain) -ForegroundColor Cyan
    $counter++

    try {
        $matches = $allSignIns | Where-Object {
            $_.UserPrincipalName -and
            $_.UserPrincipalName.EndsWith("@$domain",[StringComparison]::OrdinalIgnoreCase) -and
            (Test-LocationMatch $_ $targetCity $targetState $locationMatchMode)
        }

        foreach ($s in $matches) {
            $results += [PSCustomObject]@{
                Domain                  = $domain
                CreatedDateTime         = $s.CreatedDateTime
                UserDisplayName         = $s.UserDisplayName
                UserPrincipalName       = $s.UserPrincipalName
                IPAddress               = $s.IPAddress
                ClientAppUsed           = $s.ClientAppUsed
                ResourceDisplayName     = $s.ResourceDisplayName
                ConditionalAccessStatus = $s.ConditionalAccessStatus
                City                    = $s.Location.City
                State                   = $s.Location.State
                CountryOrRegion         = $s.Location.CountryOrRegion
            }
        }
    } catch {
        Write-Warning ("Failed to process sign-ins for domain {0}: {1}" -f $domain, $_)
    }
}

# -----------------------------
# STEP 5: Export
# -----------------------------
$outputFile = Join-Path (Get-Location) $outputFileName
if ($results.Count -eq 0) {
    "[]" | Out-File $outputFile -Encoding utf8
} else {
    $results | ConvertTo-Json -Depth 6 | Out-File $outputFile -Encoding utf8
}

Start-Process $outputFile
Disconnect-MgGraph
Write-Host "`nAll done.`n" -ForegroundColor Cyan
```
