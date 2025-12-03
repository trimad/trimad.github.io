---
author: Tristan Madden
categories: [PowerShell]
date: 2025-07-30
draft: false
tags: [Exchange, Security, Audit]
title: "Query Exchange Inbox Rules with Exchange Online PowerShell"
summary: "This enhanced PowerShell script connects to Exchange Online, iterates through all accepted domains, collects inbox rules from every mailbox, and exports a well-formatted JSON report for compliance and threat hunting."
usePageBundles: true
toc: true
---

# Exchange Online Inbox Rule Collector

This improved PowerShell script automates a full audit of inbox rules across all accepted domains in your Exchange Online tenant. It identifies rules that may forward, redirect, or move emails — common indicators of malicious inbox compromise — and exports the findings to a formatted JSON file.

## Key Improvements

The updated script includes several major upgrades over the previous version:

- **Domain-Aware Enumeration** — Automatically loops through all *accepted domains* instead of hardcoding one.
- **Smart Filtering** — Only scans mailboxes with primary SMTP addresses in valid tenant domains.
- **Structured Output** — Saves results in `FilteredInboxRules.json` with a clean, hierarchical JSON structure.
- **Automatic File Launch** — Opens the JSON file automatically at completion.
- **Built-In Error Handling** — Gracefully skips inaccessible mailboxes and continues processing.
- **Readable Console Output** — Displays progress with color-coded feedback for visibility.

---

## Prerequisites

Before running the script, ensure:

- You have the **Exchange Online PowerShell module** (`Connect-ExchangeOnline`)
- You’re a **Global Admin** or have delegated permissions to read all mailboxes
- You’re running **PowerShell 5.1+** or **PowerShell Core**

---

## Script Overview

```powershell
<#
.SYNOPSIS
Collects inbox rules from all mailboxes across all accepted domains
and exports them to a formatted JSON file.

.DESCRIPTION
This script connects to Exchange Online, enumerates all accepted domains,
retrieves all mailboxes for each, and exports their inbox rules to
FilteredInboxRules.json for review or auditing.
#>

Write-Host "`n=== Exchange Online Inbox Rule Collector ===`n" -ForegroundColor Cyan

# --- STEP 1: Connect to Exchange Online ---
try {
    Write-Host "Connecting to Exchange Online..." -ForegroundColor Yellow
    Connect-ExchangeOnline -ErrorAction Stop
    Write-Host "✅ Connected successfully.`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to connect to Exchange Online: $_" -ForegroundColor Red
    exit
}

# --- STEP 2: Get all accepted domains ---
Write-Host "Retrieving accepted domains..." -ForegroundColor Yellow
$acceptedDomains = Get-AcceptedDomain | Select-Object DomainName, DomainType, Default

if (-not $acceptedDomains) {
    Write-Host "❌ No accepted domains found. Exiting." -ForegroundColor Red
    Disconnect-ExchangeOnline -Confirm:$false
    exit
}

Write-Host "`n=== Accepted Domains ===" -ForegroundColor Cyan
$acceptedDomains | Format-Table DomainName, DomainType, Default
$domainPattern = ($acceptedDomains.DomainName -join '|')

# --- STEP 3: Gather all mailboxes in valid domains ---
Write-Host "`nEnumerating mailboxes..." -ForegroundColor Yellow
$mailboxes = Get-Mailbox -ResultSize Unlimited | Where-Object {
    $_.PrimarySmtpAddress -match "@($domainPattern)$"
}

if (-not $mailboxes) {
    Write-Host "❌ No mailboxes found for the accepted domains." -ForegroundColor Red
    Disconnect-ExchangeOnline -Confirm:$false
    exit
}

Write-Host ("Found {0} mailboxes across {1} accepted domains.`n" -f $mailboxes.Count, $acceptedDomains.Count) -ForegroundColor Green

# --- STEP 4: Collect inbox rules ---
$allRules = @()
$counter = 1

foreach ($mbx in $mailboxes) {
    Write-Host ("[{0}/{1}] Checking rules for {2}..." -f $counter, $mailboxes.Count, $mbx.PrimarySmtpAddress) -ForegroundColor Cyan
    $counter++

    try {
        $rules = Get-InboxRule -Mailbox $mbx.PrimarySmtpAddress -ErrorAction Stop
        foreach ($rule in $rules) {
            $filtered = [PSCustomObject]@{
                Mailbox               = $mbx.PrimarySmtpAddress
                Name                  = $rule.Name
                Enabled               = $rule.Enabled
                Priority              = $rule.Priority
                Description           = $rule.Description
                From                  = ($rule.From | ForEach-Object { $_.Address }) -join ', '
                FromAddressContains   = ($rule.FromAddressContainsWords -join ', ')
                SubjectContains       = ($rule.SubjectContainsWords -join ', ')
                SubjectOrBodyContains = ($rule.SubjectOrBodyContainsWords -join ', ')
                SentTo                = ($rule.SentTo | ForEach-Object { $_.Address }) -join ', '
                MoveToFolder          = $rule.MoveToFolder
                MarkAsRead            = $rule.MarkAsRead
                ForwardTo             = ($rule.ForwardTo | ForEach-Object { $_.Address }) -join ', '
                RedirectTo            = ($rule.RedirectTo | ForEach-Object { $_.Address }) -join ', '
                StopProcessingRules   = $rule.StopProcessingRules
            }
            $allRules += $filtered
        }
    } catch {
        Write-Warning "Failed to retrieve rules for $($mbx.PrimarySmtpAddress): $_"
    }
}

# --- STEP 5: Export results to JSON ---
$outputFile = Join-Path (Get-Location) "FilteredInboxRules.json"
if ($allRules.Count -eq 0) {
    Write-Warning "No inbox rules were found for any mailbox."
    "[]" | Out-File -FilePath $outputFile -Encoding utf8
} else {
    $allRules | ConvertTo-Json -Depth 5 | Out-File -FilePath $outputFile -Encoding utf8
    Write-Host ("`n✅ Exported {0} inbox rules to {1}" -f $allRules.Count, $outputFile) -ForegroundColor Green
}

# --- STEP 6: Open the file automatically ---
Start-Process $outputFile

# --- STEP 7: Clean up session ---
Disconnect-ExchangeOnline -Confirm:$false
Write-Host "`nSession disconnected. All done!`n" -ForegroundColor Cyan
```

---

## Example Output

When the script completes, it will produce a JSON file similar to this:

```json
[
  {
    "Mailbox": "john.doe@domain.com",
    "Name": "Auto-Forward External",
    "Enabled": true,
    "Priority": 1,
    "From": "",
    "SubjectContains": "",
    "MoveToFolder": "",
    "ForwardTo": "externaluser@gmail.com",
    "StopProcessingRules": true
  }
]
```