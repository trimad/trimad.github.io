---
author: Tristan Madden
categories: [PowerShell]
date: 2025-07-30
draft: false
tags: ["exchange-online"]
title: "Export Exchange Inbox Rules with Exchange Online PowerShell"
summary: "Two companion PowerShell scripts: one for auditing inbox rules across an entire tenant, and another for inspecting rules for a single mailbox - perfect for threat hunting, compliance, and incident response."
usePageBundles: true
toc: true
---

# Exchange Online Inbox Rule Auditing

Monitoring inbox rules is one of the most effective ways to detect compromised accounts in Microsoft 365. Attackers commonly create forwarding or redirect rules to exfiltrate mail or hide activity.

This post provides **two complementary PowerShell scripts**:

1. **Tenant-wide inbox rule collector** - audits every mailbox across all accepted domains  
2. **Single-user inbox rule collector** - ideal for incident response and targeted investigations  

Both scripts export results into clean JSON files suitable for SOC review or automated detection pipelines.

---

# Query All Users (Organization-Wide)

This script enumerates all accepted domains, collects inbox rules from every mailbox in the tenant, and exports a unified JSON report. It's ideal for scheduled audits, compromise assessment, or large-scale security reviews.

## Key Capabilities

- **Domain-aware enumeration** - Automatically detects all accepted domains in the tenant  
- **Mailbox filtering** - Only scans relevant SMTP domains  
- **Color-coded progress output** - Useful for long-running audits  
- **Graceful error handling** - Skips inaccessible mailboxes  
- **Structured JSON output** - Saves as `FilteredInboxRules.json` and opens automatically  

---

## Script: Query All Users

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
$domainPattern = ($acceptedDomains.DomainName -join '|')

# --- STEP 3: Gather all mailboxes in valid domains ---
Write-Host "`nEnumerating mailboxes..." -ForegroundColor Yellow
$mailboxes = Get-Mailbox -ResultSize Unlimited | Where-Object {
    $_.PrimarySmtpAddress -match "@($domainPattern)$"
}

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
    Write-Host ("`n[OK] Exported {0} inbox rules to {1}" -f $allRules.Count, $outputFile) -ForegroundColor Green
}

# --- STEP 6: Open the file automatically ---
Start-Process $outputFile

# --- STEP 7: Clean up session ---
Disconnect-ExchangeOnline -Confirm:$false
Write-Host "`nSession disconnected. All done!`n" -ForegroundColor Cyan

```

# Query a Single User (Targeted Audit)

This companion script focuses on **one mailbox at a time**.

## Key Capabilities

- Mailbox validation - Confirms the mailbox exists before running any queries
- Targeted rule inspection - Retrieves inbox rules for only one specified mailbox
- Ideal for incident response - Quickly exposes forwarding, redirect, or exfiltration rules linked to suspicious activity
- Lightweight execution - Much faster than tenant-wide enumeration; minimal data collection
- Structured JSON export - Outputs to `SingleMailboxInboxRules.json` for easy sharing, auditing, or investigation
- Safe error handling - Gracefully handles missing mailboxes or permission issues without halting your session

## Script: Query a Single User

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


