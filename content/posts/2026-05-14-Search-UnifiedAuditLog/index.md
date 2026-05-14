---
ai: true
ai-tested-date: 2026-05-14
author: "Tristan Madden"
categories:
  - "PowerShell"
  - "Microsoft 365"
  - "Exchange Online"
date: 2026-05-14
draft: false
summary: "Use two Exchange Online PowerShell scripts to export Unified Audit Log events performed by a mailbox identity or performed to a mailbox object."
tags:
  - "powershell"
  - "exchange-online"
  - "microsoft-365"
  - "unified-audit-log"
  - "mailbox-audit"
title: "Search Unified Audit Log for Mailbox Activity"
toc: true
usePageBundles: true
---

## Overview

When investigating mailbox activity in Microsoft 365, it helps to separate two related questions:

- What did this mailbox identity do?
- What happened to this mailbox or object?

These two PowerShell scripts search the Unified Audit Log from both directions. `Search-UnifiedAuditLog-operations-performed-by.ps1` uses `-UserIds` to find operations performed by a mailbox identity. `Search-UnifiedAuditLog-operations-performed-to.ps1` uses `-ObjectIds` to find operations performed to or against the mailbox object.

Both scripts connect to Exchange Online, search the last seven days by default, collect large audit result sets in batches, parse the `AuditData` JSON payload, and export the results to CSV in the same folder as the script.

## Requirements

- PowerShell on a workstation that can connect to Exchange Online
- The `ExchangeOnlineManagement` PowerShell module
- A Microsoft 365 account that can run `Search-UnifiedAuditLog`
- Audit log permissions, typically through the `View-Only Audit Logs` or `Audit Logs` role
- Unified Audit Log retention that covers the date range you want to search
- Local permission to write the exported CSV file

## Key Capabilities

- Searches mailbox audit activity by actor with `-UserIds`
- Searches mailbox audit activity by target object with `-ObjectIds`
- Uses a unique `SessionId` and `ReturnLargeSet` for paged audit log retrieval
- Requests up to 5,000 records per batch
- Parses `AuditData` JSON into review-friendly CSV columns
- Preserves the original raw audit payload in `RawAuditData`
- Sorts exported events by time
- Prints result counts after export
- Groups remaining operations in the performed-by script after filtering noisy events

## Download

{{< download-resource file="Search-UnifiedAuditLog-operations-performed-by.ps1" title="Operations Performed By Script" label="Download Search-UnifiedAuditLog-operations-performed-by.ps1" >}}
Use this script when you want to know what actions were performed by a specific mailbox identity. It searches the Unified Audit Log with `-UserIds`.
{{< /download-resource >}}

{{< download-resource file="Search-UnifiedAuditLog-operations-performed-to.ps1" title="Operations Performed To Script" label="Download Search-UnifiedAuditLog-operations-performed-to.ps1" >}}
Use this script when you want to know what actions were performed to or against a specific mailbox or object. It searches the Unified Audit Log with `-ObjectIds`.
{{< /download-resource >}}

## The Scripts

### Operations Performed By

`Search-UnifiedAuditLog-operations-performed-by.ps1` is the actor-focused script. It answers, "What did this mailbox identity do?"

The important line is the `Search-UnifiedAuditLog` call with `-UserIds $Mailbox`. After the events are parsed, the script filters out `FileAccessed` and `MailItemsAccessed` so the CSV focuses on less noisy operations. You can add or remove operations in `$ExcludedOperations` if your investigation needs a different level of detail.

```powershell
Import-Module ExchangeOnlineManagement -ErrorAction Stop
Connect-ExchangeOnline -ErrorAction Stop

$Mailbox = "mailbox@domain.com"

$StartDate = (Get-Date).AddDays(-7)
$EndDate   = Get-Date

$ExportPath = Join-Path $PSScriptRoot "$Mailbox-$($StartDate.ToString('yyyy-MM-dd'))-$($EndDate.ToString('yyyy-MM-dd')).csv"

$SessionId = "PerformedByMailboxAudit_$([guid]::NewGuid().ToString())"

$AllResults = @()

do {
    Write-Host "Searching audit log batch... Current count: $($AllResults.Count)"

    $Batch = Search-UnifiedAuditLog `
        -StartDate $StartDate `
        -EndDate $EndDate `
        -UserIds $Mailbox `
        -SessionId $SessionId `
        -SessionCommand ReturnLargeSet `
        -ResultSize 5000 `
        -ErrorAction Stop

    if ($Batch) {
        $AllResults += $Batch
    }

} while ($Batch.Count -gt 0)

$ParsedResults = $AllResults | ForEach-Object {
    $AuditData = $_.AuditData | ConvertFrom-Json

    $Parameters = if ($AuditData.Parameters) {
        ($AuditData.Parameters | ForEach-Object {
            "$($_.Name)=$($_.Value)"
        }) -join "; "
    } else {
        ""
    }

    [PSCustomObject]@{
        Time            = $_.CreationDate
        Operation       = $_.Operations
        Actor           = $_.UserIds
        Workload        = $AuditData.Workload
        RecordType      = $AuditData.RecordType
        ObjectId        = $AuditData.ObjectId
        MailboxOwnerUPN = $AuditData.MailboxOwnerUPN
        MailboxGuid     = $AuditData.MailboxGuid
        ClientIP        = $AuditData.ClientIP
        UserAgent       = $AuditData.UserAgent
        LogonType       = $AuditData.LogonType
        ResultStatus    = $AuditData.ResultStatus
        Parameters      = $Parameters
        RawAuditData    = $_.AuditData
    }
}

$ExcludedOperations = @(
    "FileAccessed",
    "MailItemsAccessed"
)

$FilteredResults = $ParsedResults | Where-Object {
    $OperationName = "$($_.Operation)".Trim()
    $ExcludedOperations -notcontains $OperationName
}

$FilteredResults |
    Sort-Object Time |
    Export-Csv $ExportPath -NoTypeInformation

Write-Host "Export complete: $ExportPath"
Write-Host "Results found before filtering: $($ParsedResults.Count)"
Write-Host "Results found after filtering: $($FilteredResults.Count)"

Write-Host ""
Write-Host "Remaining operations:"
$FilteredResults |
    Group-Object Operation |
    Sort-Object Count -Descending |
    Select-Object Count, Name |
    Format-Table -AutoSize
```

### Operations Performed To

`Search-UnifiedAuditLog-operations-performed-to.ps1` is the target-focused script. It answers, "What happened to this mailbox or object?"

The important line is the `Search-UnifiedAuditLog` call with `-ObjectIds $Mailbox`. This version does not filter operations after parsing, so the exported CSV keeps every returned audit event for the object within the selected date range.

```powershell
Import-Module ExchangeOnlineManagement -ErrorAction Stop
Connect-ExchangeOnline -ErrorAction Stop

$Mailbox = "mailbox@domain.com"

$StartDate = (Get-Date).AddDays(-7)
$EndDate   = Get-Date

$ExportPath = Join-Path $PSScriptRoot "$Mailbox-$($StartDate.ToString('yyyy-MM-dd'))-$($EndDate.ToString('yyyy-MM-dd')).csv"

$SessionId = "BackgroundchecksMailboxAudit_$([guid]::NewGuid().ToString())"

$AllResults = @()

do {
    Write-Host "Searching audit log batch... Current count: $($AllResults.Count)"

    $Batch = Search-UnifiedAuditLog `
        -StartDate $StartDate `
        -EndDate $EndDate `
        -ObjectIds $Mailbox `
        -SessionId $SessionId `
        -SessionCommand ReturnLargeSet `
        -ResultSize 5000

    if ($Batch) {
        $AllResults += $Batch
    }

} while ($Batch.Count -gt 0)

$ParsedResults = $AllResults | ForEach-Object {
    $AuditData = $_.AuditData | ConvertFrom-Json

    $Parameters = if ($AuditData.Parameters) {
        ($AuditData.Parameters | ForEach-Object {
            "$($_.Name)=$($_.Value)"
        }) -join "; "
    } else {
        ""
    }

    [PSCustomObject]@{
        Time            = $_.CreationDate
        Operation       = $_.Operations
        Actor           = $_.UserIds
        Workload        = $AuditData.Workload
        RecordType      = $AuditData.RecordType
        ObjectId        = $AuditData.ObjectId
        MailboxOwnerUPN = $AuditData.MailboxOwnerUPN
        MailboxGuid     = $AuditData.MailboxGuid
        ClientIP        = $AuditData.ClientIP
        UserAgent       = $AuditData.UserAgent
        LogonType       = $AuditData.LogonType
        ResultStatus    = $AuditData.ResultStatus
        Parameters      = $Parameters
        RawAuditData    = $_.AuditData
    }
}

$ParsedResults |
    Sort-Object Time |
    Export-Csv $ExportPath -NoTypeInformation

Write-Host "Export complete: $ExportPath"
Write-Host "Results found: $($ParsedResults.Count)"
```

## How to Use

1. Install the Exchange Online module if needed:

```powershell
Install-Module ExchangeOnlineManagement
```

2. Download the script that matches the question you are asking.

3. Edit the mailbox placeholder in the script:

```powershell
$Mailbox = "user@contoso.com"
```

4. Adjust the date range if the default last seven days is not enough:

```powershell
$StartDate = (Get-Date).AddDays(-30)
$EndDate   = Get-Date
```

5. Run the script from PowerShell:

```powershell
.\Search-UnifiedAuditLog-operations-performed-by.ps1
```

or:

```powershell
.\Search-UnifiedAuditLog-operations-performed-to.ps1
```

6. Authenticate to Exchange Online when prompted.

7. Review the exported CSV in the script folder. The generated name uses the mailbox and date range:

```text
user@contoso.com-2026-05-07-2026-05-14.csv
```

## Example Output

The console output for the performed-by script looks like this after the export completes:

```text
Searching audit log batch... Current count: 0
Export complete: C:\Audit\user@contoso.com-2026-05-07-2026-05-14.csv
Results found before filtering: 42
Results found after filtering: 8

Remaining operations:

Count Name
----- ----
    3 Send
    2 UpdateInboxRules
    1 MailboxLogin
    1 Set-Mailbox
    1 HardDelete
```

The CSV includes columns like these:

```text
Time,Operation,Actor,Workload,RecordType,ObjectId,MailboxOwnerUPN,MailboxGuid,ClientIP,UserAgent,LogonType,ResultStatus,Parameters,RawAuditData
```

## Notes

- Use the performed-by script when the mailbox identity is the actor you care about.
- Use the performed-to script when the mailbox or object is the target you care about.
- The two scripts can return different event sets for the same mailbox because `-UserIds` and `-ObjectIds` filter different audit fields.
- The export path is based on `$PSScriptRoot`, so the CSV is written next to the script file.
- `Search-UnifiedAuditLog` availability depends on Microsoft 365 audit retention, licensing, permissions, and whether auditing was enabled during the period being investigated.
- Large tenants and broad date ranges can return many events. Start with a narrow window, then expand if needed.
- `MailItemsAccessed` and `FileAccessed` can be high-volume operations. The performed-by script excludes them by default, but you can remove them from `$ExcludedOperations` if you need the full activity set.
