---
ai: true
ai-tested: 2026-04-10
author: "Tristan Madden"
categories:
  - "PowerShell"
  - "Microsoft 365"
date: 2025-07-30
draft: false
summary: "Export current Exchange Online inbox rules or audit inbox rule changes with four PowerShell scripts for tenant-wide review, single-mailbox triage, and Unified Audit Log history."
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

This post now includes four companion Exchange Online PowerShell scripts in two pairs. The original pair exports the inbox rules that exist right now by using `Get-InboxRule`. The newer pair searches the Unified Audit Log for `New-InboxRule`, `Set-InboxRule`, and `Remove-InboxRule`, which is the better fit when you need change history instead of only the current state.

## Requirements

- PowerShell with the `ExchangeOnlineManagement` module available
- An account that can connect to Exchange Online
- Permission to run `Get-AcceptedDomain`, `Get-Mailbox`, and `Get-InboxRule` for the export scripts
- Permission to use `Search-UnifiedAuditLog` for the audit scripts, typically through the `View-Only Audit Logs` or `Audit Logs` role
- Access to `Connect-IPPSSession` if the audit cmdlet is not already available after `Connect-ExchangeOnline`
- Local permission to write JSON files to disk
- Network access to Microsoft 365

## Key Capabilities

- Exports current inbox rules to structured JSON for review or downstream automation
- Retrieves raw audit history for inbox rule creation, modification, and removal
- Supports both tenant-wide collection and single-mailbox triage for each approach
- Surfaces common investigation fields such as `ForwardTo`, `RedirectTo`, `MoveToFolder`, and `StopProcessingRules`
- Supports date range, operation, and output directory parameters for the audit scripts
- Continues past individual mailbox errors instead of aborting the whole run in the tenant-wide modes
- Opens the exported JSON automatically when the current-state scripts finish

## Choose the Right Script

| Need | Script | Output |
| --- | --- | --- |
| Current inbox rule inventory across accepted domains | `Export-Exchange-Inbox-Rules-All-Mailboxes.ps1` | `FilteredInboxRules.json` |
| Current inbox rule inventory for one mailbox | `Export-Exchange-Inbox-Rules-Single-Mailbox.ps1` | `SingleMailboxInboxRules.json` |
| Audit trail for one mailbox's rule creation, changes, and removals | `Audit-Inbox-Rules-New-Set-Remove.ps1` | `<mailbox>.json` |
| Audit trail across accepted domains with a mailbox-by-mailbox summary | `Audit-ALL-Inbox-Rules-New-Set-Remove.ps1` | `Audit-ALL-Inbox-Rules-New-Set-Remove.json` |

## Download

{{< download-resource file="Export-Exchange-Inbox-Rules-All-Mailboxes.ps1" title="Tenant Audit Script" label="Download Export-Exchange-Inbox-Rules-All-Mailboxes.ps1" >}}
Use this version when you want to enumerate mailboxes across the tenant, collect every inbox rule you can access, and export the results into a single JSON file.
{{< /download-resource >}}

{{< download-resource file="Export-Exchange-Inbox-Rules-Single-Mailbox.ps1" title="Single Mailbox Script" label="Download Export-Exchange-Inbox-Rules-Single-Mailbox.ps1" >}}
Use this version when you need a faster, narrower audit for one mailbox during a phishing investigation, suspected compromise review, or targeted mailbox validation.
{{< /download-resource >}}

{{< download-resource file="Audit-Inbox-Rules-New-Set-Remove.ps1" title="Single Mailbox Audit History Script" label="Download Audit-Inbox-Rules-New-Set-Remove.ps1" >}}
Use this version when you need Unified Audit Log history for one mailbox, including inbox rule creation, modification, and removal activity over a date range.
{{< /download-resource >}}

{{< download-resource file="Audit-ALL-Inbox-Rules-New-Set-Remove.ps1" title="Tenant-Wide Audit History Script" label="Download Audit-ALL-Inbox-Rules-New-Set-Remove.ps1" >}}
Use this version when you want to hunt across accepted domains for inbox rule changes and removals, then export the combined audit events into one JSON file.
{{< /download-resource >}}

## Current State vs Audit History

The older export scripts answer the question, "What rules exist right now?" The newer audit scripts answer, "What happened to inbox rules over time?" In practice, the best script depends on whether you need a clean configuration snapshot or a timeline.

| Question | Export Scripts | Audit Scripts |
| --- | --- | --- |
| What inbox rules exist right now? | Best choice | Not ideal for this |
| Who created, changed, or removed a rule? | Cannot answer | Best choice |
| Could a deleted malicious rule still show up? | No | Yes, if the event is still in audit log retention |
| Required access | `Get-InboxRule` and mailbox discovery access | Unified Audit Log access plus mailbox discovery access |
| Output style | Trimmed, rule-focused JSON | Raw audit payloads that are better for forensic review |
| Operational overhead | Simpler and usually faster | Heavier and usually slower, especially tenant-wide |

If you already know the suspicious mailbox, start with the single-mailbox export script to see the current rule set quickly, then use the single-mailbox audit script if you need change history or suspect a rule was created and removed before you started looking.

If you are hunting across the tenant, use the older all-mailbox export script for baseline and compliance-style inventory, and use the newer all-mailbox audit script when you specifically need evidence of inbox rule tampering or a broader activity timeline.

## Single Mailbox Audit History

`Audit-Inbox-Rules-New-Set-Remove.ps1` focuses on one mailbox and searches the Unified Audit Log for `New-InboxRule`, `Set-InboxRule`, and `Remove-InboxRule` events. Unlike the older single-mailbox export script, it is designed for timeline reconstruction rather than current-state inventory.

### What It Does

- Ensures the `ExchangeOnlineManagement` module is available and imports it
- Connects to Exchange Online and falls back to `Connect-IPPSSession` if `Search-UnifiedAuditLog` is not loaded yet
- Searches a date range that defaults to the last 90 days
- Parses the raw `AuditData` JSON when possible and writes the results to a mailbox-named JSON file
- Lets you narrow or expand the operation list through the `-Operations` parameter

### How to Use

1. Run the default audit search for one mailbox:

```powershell
.\Audit-Inbox-Rules-New-Set-Remove.ps1 -TargetMailbox user@contoso.com
```

2. Use explicit dates, an admin UPN, and a custom output path if you need tighter control:

```powershell
.\Audit-Inbox-Rules-New-Set-Remove.ps1 `
  -AdminUpn admin@contoso.com `
  -TargetMailbox user@contoso.com `
  -StartDate (Get-Date).Date.AddDays(-30) `
  -EndDate (Get-Date) `
  -OutputDirectory C:\Audit
```

3. Review the exported mailbox JSON file after the script prints the path.

### When to Pick It Over the Old Single-Mailbox Script

- Pick the new audit script when you need to know when a rule was created, changed, or removed.
- Pick the new audit script when you suspect a malicious rule was briefly added and later deleted.
- Pick the old export script when you only need the mailbox's current rules in a cleaner, smaller JSON export.
- Pick the old export script when you do not have Unified Audit Log access but can still query the mailbox rules directly.

## Tenant-Wide Audit History

`Audit-ALL-Inbox-Rules-New-Set-Remove.ps1` enumerates accepted domains, identifies mailboxes in those domains, and then searches the Unified Audit Log for each mailbox. It is the tenant-wide historical companion to `Export-Exchange-Inbox-Rules-All-Mailboxes.ps1`.

### What It Does

- Ensures the `ExchangeOnlineManagement` module is installed and imported
- Connects to Exchange Online and loads audit search capability
- Enumerates accepted domains and limits mailbox selection to those domains
- Searches each mailbox for the selected inbox rule operations over the chosen date range
- Exports combined raw audit data and prints a per-mailbox summary showing `Success`, `NoEvents`, or `Failed`

### How to Use

1. Run the default tenant-wide audit search:

```powershell
.\Audit-ALL-Inbox-Rules-New-Set-Remove.ps1
```

2. Limit the search window or send the output somewhere specific:

```powershell
.\Audit-ALL-Inbox-Rules-New-Set-Remove.ps1 `
  -AdminUpn admin@contoso.com `
  -StartDate (Get-Date).Date.AddDays(-30) `
  -EndDate (Get-Date) `
  -OutputDirectory C:\Audit
```

3. Review `Audit-ALL-Inbox-Rules-New-Set-Remove.json` and the mailbox summary shown in the console.

### When to Pick It Over the Old Tenant-Wide Script

- Pick the new audit script when your goal is inbox rule activity hunting, not just inventory.
- Pick the new audit script when you need tenant-wide evidence of `New-InboxRule`, `Set-InboxRule`, or `Remove-InboxRule` activity.
- Pick the new audit script when you want a mailbox-by-mailbox status summary in addition to the raw event export.
- Pick the old export script when you want the current rule set across the tenant for baseline review, compliance checks, or quick spot-checking.

## Tenant-Wide Current-State Export

This script enumerates accepted domains, filters mailboxes to those domains, and exports every inbox rule it can retrieve into one JSON document. It is the better choice when you need broad visibility into the rules that exist right now and do not need historical change data.

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

## Single Mailbox Current-State Export

This companion script asks for one mailbox, validates that it exists, and then exports only that mailbox's rules. It is better for triage when you already know which account you care about and want the shortest path to the current rule set.

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
- The audit scripts can surface `New-InboxRule`, `Set-InboxRule`, and `Remove-InboxRule` history that the current-state export scripts cannot show.
- The audit scripts depend on Unified Audit Log retention and appropriate audit-log permissions, so very old events may not be returned.
- The tenant-wide audit-history script is usually slower than the tenant-wide export script because it runs audit searches mailbox by mailbox.
- Pay close attention to `ForwardTo`, `RedirectTo`, `MoveToFolder`, `MarkAsRead`, and `StopProcessingRules` during review because those settings are often useful during compromise investigations.
- The tenant-wide current-state export script is slower in large environments because it queries every matching mailbox sequentially.
