---
ai: true
ai-tested: 2026-04-10
author: "Tristan Madden"
categories:
  - "PowerShell"
  - "Microsoft 365"
date: 2025-07-30
draft: false
summary: "Audit Exchange Online inbox rules with two PowerShell scripts: one exports rules across the tenant and the other targets a single mailbox for incident response."
tags:
  - "powershell"
  - "exchange-online"
  - "microsoft-365"
  - "inbox-rules"
title: "Export Exchange Inbox Rules with Exchange Online PowerShell"
toc: true
usePageBundles: true
---

## Overview

Inbox rules are one of the simplest ways for an attacker to hide or redirect mail after compromising a Microsoft 365 account. A suspicious rule can silently forward messages, move alerts out of sight, or stop later rules from running.

This post includes two companion Exchange Online PowerShell scripts. One collects inbox rules across the tenant for broad hunting or compliance review. The other focuses on a single mailbox, which is usually the faster option during incident response.

## Requirements

- PowerShell with the `ExchangeOnlineManagement` module available
- An account that can connect to Exchange Online and read mailbox inbox rules
- Permission to run `Get-AcceptedDomain`, `Get-Mailbox`, and `Get-InboxRule`
- Local permission to write JSON files to disk
- Network access to Microsoft 365

## Key Capabilities

- Exports inbox rules to structured JSON for review or downstream automation
- Supports both tenant-wide collection and single-mailbox triage
- Surfaces common investigation fields such as `ForwardTo`, `RedirectTo`, `MoveToFolder`, and `StopProcessingRules`
- Continues past individual mailbox errors instead of aborting the whole run
- Opens the exported JSON automatically when the script finishes

## Choose the Right Script

| Use case | Script | Output |
| --- | --- | --- |
| Scheduled audit, threat hunting, or tenant-wide review | `Export-Exchange-Inbox-Rules-All-Mailboxes.ps1` | `FilteredInboxRules.json` |
| One-user investigation or incident-response triage | `Export-Exchange-Inbox-Rules-Single-Mailbox.ps1` | `SingleMailboxInboxRules.json` |

## Download

{{< download-resource file="Export-Exchange-Inbox-Rules-All-Mailboxes.ps1" title="Tenant Audit Script" label="Download Export-Exchange-Inbox-Rules-All-Mailboxes.ps1" >}}
Use this version when you want to enumerate mailboxes across the tenant, collect every inbox rule you can access, and export the results into a single JSON file.
{{< /download-resource >}}

{{< download-resource file="Export-Exchange-Inbox-Rules-Single-Mailbox.ps1" title="Single Mailbox Script" label="Download Export-Exchange-Inbox-Rules-Single-Mailbox.ps1" >}}
Use this version when you need a faster, narrower audit for one mailbox during a phishing investigation, suspected compromise review, or targeted mailbox validation.
{{< /download-resource >}}

## Tenant-Wide Audit

This script enumerates accepted domains, filters mailboxes to those domains, and exports every inbox rule it can retrieve into one JSON document. It is the better choice when you need broad visibility and do not want to inspect mailboxes one by one.

### Script

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
    Write-Host "[OK] Connected successfully.`n" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to connect to Exchange Online: $_" -ForegroundColor Red
    exit
}

# --- STEP 2: Get all accepted domains ---
Write-Host "Retrieving accepted domains..." -ForegroundColor Yellow
$acceptedDomains = Get-AcceptedDomain | Select-Object DomainName, DomainType, Default

if (-not $acceptedDomains) {
    Write-Host "[ERROR] No accepted domains found. Exiting." -ForegroundColor Red
    Disconnect-ExchangeOnline -Confirm:$false
    exit
}

Write-Host "`n=== Accepted Domains ===" -ForegroundColor Cyan
$acceptedDomains | Format-Table DomainName, DomainType, Default
$domainPattern = ($acceptedDomains | ForEach-Object {
    [regex]::Escape($_.DomainName.ToString())
}) -join '|'

# --- STEP 3: Gather all mailboxes in valid domains ---
Write-Host "`nEnumerating mailboxes..." -ForegroundColor Yellow
$mailboxes = @(Get-Mailbox -ResultSize Unlimited | Where-Object {
    $_.PrimarySmtpAddress.ToString() -match "@($domainPattern)$"
})

if (-not $mailboxes) {
    Write-Host "[ERROR] No mailboxes found for the accepted domains." -ForegroundColor Red
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
                Mailbox               = $mbx.PrimarySmtpAddress.ToString()
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
    Write-Host ("`n[OK] Exported {0} inbox rules to {1}" -f $allRules.Count, $outputFile) -ForegroundColor Green
}

# --- STEP 6: Open the file automatically ---
Start-Process $outputFile

# --- STEP 7: Clean up session ---
Disconnect-ExchangeOnline -Confirm:$false
Write-Host "`nSession disconnected. All done!`n" -ForegroundColor Cyan
```

### How to Use

1. Install the Exchange Online module if needed:

```powershell
Install-Module ExchangeOnlineManagement
```

2. Run the script:

```powershell
.\Export-Exchange-Inbox-Rules-All-Mailboxes.ps1
```

3. Authenticate to Exchange Online when prompted.
4. Review `FilteredInboxRules.json` after the script opens it automatically.

### Example Output

```text
=== Exchange Online Inbox Rule Collector ===

Connecting to Exchange Online...
[OK] Connected successfully.

Retrieving accepted domains...

=== Accepted Domains ===
DomainName                DomainType    Default
----------                ----------    -------
contoso.com               Authoritative True
contoso.onmicrosoft.com   InternalRelay False

Found 428 mailboxes across 2 accepted domains.

[1/428] Checking rules for alice@contoso.com...
[2/428] Checking rules for bob@contoso.com...
...

[OK] Exported 137 inbox rules to C:\Audit\FilteredInboxRules.json

Session disconnected. All done!
```

## Single Mailbox Audit

This companion script asks for one mailbox, validates that it exists, and then exports only that mailbox's rules. It is better for triage when you already know which account you care about and want the shortest path to the answer.

### Script

```powershell
<#
.SYNOPSIS
Collects inbox rules for a single mailbox and exports them to a formatted JSON file.

.DESCRIPTION
This script connects to Exchange Online and retrieves all inbox rules for a
specified mailbox, then exports the results to SingleMailboxInboxRules.json.
#>

Write-Host "`n=== Single Mailbox Inbox Rule Collector ===`n" -ForegroundColor Cyan

# --- STEP 1: Prompt for mailbox ---
$mailbox = Read-Host "Enter the mailbox (UPN or SMTP address)"

if (-not $mailbox) {
    Write-Host "[ERROR] No mailbox provided. Exiting." -ForegroundColor Red
    exit
}

# --- STEP 2: Connect to Exchange Online ---
try {
    Write-Host "Connecting to Exchange Online..." -ForegroundColor Yellow
    Connect-ExchangeOnline -ErrorAction Stop
    Write-Host "[OK] Connected successfully.`n" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to connect to Exchange Online: $_" -ForegroundColor Red
    exit
}

# --- STEP 3: Validate mailbox existence ---
try {
    $mbx = Get-Mailbox -Identity $mailbox -ErrorAction Stop
    Write-Host "Mailbox found: $($mbx.PrimarySmtpAddress)`n" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Mailbox not found or inaccessible: $_" -ForegroundColor Red
    Disconnect-ExchangeOnline -Confirm:$false
    exit
}

# --- STEP 4: Retrieve inbox rules ---
Write-Host "Retrieving inbox rules for $($mbx.PrimarySmtpAddress)...`n" -ForegroundColor Yellow

$rules = @()

try {
    $inboxRules = Get-InboxRule -Mailbox $mbx.PrimarySmtpAddress -ErrorAction Stop

    foreach ($rule in $inboxRules) {
        $rules += [PSCustomObject]@{
            Mailbox               = $mbx.PrimarySmtpAddress.ToString()
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
    }
} catch {
    Write-Host "[ERROR] Failed to retrieve inbox rules: $_" -ForegroundColor Red
}

# --- STEP 5: Export results to JSON ---
$outputFile = Join-Path (Get-Location) "SingleMailboxInboxRules.json"

if ($rules.Count -eq 0) {
    Write-Warning "No inbox rules found for this mailbox."
    "[]" | Out-File -FilePath $outputFile -Encoding utf8
} else {
    $rules | ConvertTo-Json -Depth 5 | Out-File -FilePath $outputFile -Encoding utf8
    Write-Host ("`n[OK] Exported {0} inbox rules to {1}" -f $rules.Count, $outputFile) -ForegroundColor Green
}

# --- STEP 6: Open the output file ---
Start-Process $outputFile

# --- STEP 7: Clean up session ---
Disconnect-ExchangeOnline -Confirm:$false
Write-Host "`nSession disconnected. All done!`n" -ForegroundColor Cyan
```

### How to Use

1. Run the script:

```powershell
.\Export-Exchange-Inbox-Rules-Single-Mailbox.ps1
```

2. Enter the mailbox UPN or SMTP address when prompted.
3. Authenticate to Exchange Online if you are not already connected.
4. Review `SingleMailboxInboxRules.json` after the script opens it automatically.

### Example Output

```text
=== Single Mailbox Inbox Rule Collector ===

Enter the mailbox (UPN or SMTP address): user@contoso.com
Connecting to Exchange Online...
[OK] Connected successfully.

Mailbox found: user@contoso.com

Retrieving inbox rules for user@contoso.com...

[OK] Exported 3 inbox rules to C:\Audit\SingleMailboxInboxRules.json

Session disconnected. All done!
```

## Notes

- If the Exchange Online module is not installed, run `Install-Module ExchangeOnlineManagement` from an elevated PowerShell session first.
- The tenant-wide script skips mailboxes it cannot query and writes a warning instead of stopping the entire run.
- If a mailbox has no inbox rules, the script still writes a valid empty JSON array.
- Pay close attention to `ForwardTo`, `RedirectTo`, `MoveToFolder`, `MarkAsRead`, and `StopProcessingRules` during review because those settings are often useful during compromise investigations.
- The tenant-wide script is slower in large environments because it queries every matching mailbox sequentially.
