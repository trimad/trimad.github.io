---
author: Tristan Madden
categories: [PowerShell]
date: 2025-07-31
draft: false
tags: [Exchange]
title: Exchange Inbox Rules
summary: "This PowerShell script connects to Exchange Online, collects inbox rules for all mailboxes in a specific domain, and exports the data in JSON format for audit or reporting purposes."
usePageBundles: true
toc: true
---

# Exchange Inbox Rules Export Script

This PowerShell script connects to Exchange Online, retrieves all inbox rules for every mailbox in the `domain.com` tenant, filters and formats the output into a structured list, and saves the data to a JSON file. It's useful for auditing inbox rules across all user mailboxes for compliance, troubleshooting, or analysis.

## Prerequisites

- Exchange Online PowerShell module (`Connect-ExchangeOnline`)
- Global admin or delegated permission to read all mailboxes
- PowerShell 5.1+ or PowerShell Core

---

## Script Overview

```powershell
# Connect to Exchange Online (if not already connected)
Connect-ExchangeOnline
```

```powershell
# Get all mailboxes with a primary SMTP address ending in @domain.com
$mailboxes = Get-Mailbox -ResultSize Unlimited | Where-Object {
    $_.PrimarySmtpAddress -like "*@domain.com"
}
```

```powershell
# Create a collection to store all rules
$allRules = @()

# Iterate through each mailbox to collect inbox rules
foreach ($mbx in $mailboxes) {
    Write-Host "Checking rules for $($mbx.PrimarySmtpAddress)..."
    try {
        # Fetch all inbox rules for the mailbox
        $rules = Get-InboxRule -Mailbox $mbx.PrimarySmtpAddress
        foreach ($rule in $rules) {
            # Construct a filtered rule object with relevant fields
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
        # Log if fetching inbox rules fails
        Write-Warning "Failed to get rules for $($mbx.PrimarySmtpAddress): $_"
    }
}
```

```powershell
# Export the aggregated inbox rules to JSON
$allRules | ConvertTo-Json -Depth 5 | Out-File -FilePath ".\FilteredInboxRules.json" -Encoding utf8

Write-Host "Export complete. File saved to FilteredInboxRules.json"
```

---

## Output

- A JSON file named `FilteredInboxRules.json` will be created in the current directory.
- This file contains structured inbox rule data for all applicable mailboxes.

## Notes

- To change the domain filter, modify the `*@domain.com` condition.
- JSON depth of 5 ensures nested objects (e.g., ForwardTo, RedirectTo) are not truncated.
- Exported data is suitable for ingestion by reporting tools or audits.
