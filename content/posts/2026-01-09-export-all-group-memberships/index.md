---
title: "Export All Group Memberships (Teams, Microsoft 365, Distribution Lists, Security Groups)"
date: 2026-01-09
draft: false
tags:
  - microsoft-graph
  - powershell
  - m365
  - entra-id
  - exchange
categories:
  - powershell
  - microsoft-365
summary: "Export direct membership for Teams, Microsoft 365 groups, distribution lists, and security groups using Microsoft Graph PowerShell."
---

## Overview

Group sprawl is a fact of life in Microsoft 365 environments. Between Teams, Microsoft 365 groups, distribution lists, and security groups, it quickly becomes difficult to answer simple questions like:

- Who has access to what?
- Is this group still in use?
- Which users are members of multiple high‑risk groups?

This post walks through a **single PowerShell script** that connects to **Microsoft Graph** and exports **direct membership** for:

- Teams & Microsoft 365 groups
- Distribution lists
- Security groups

The result is a clean, flattened CSV that’s easy to audit, pivot, and hand off to security or compliance.

---

## What This Script Exports

Each row in the CSV represents **one group → one member** relationship and includes:

- Group type (Teams, M365, DL, Security)
- Group display name and mail address
- Member display name
- Member UPN and mail
- Member object type (User, Group, ServicePrincipal, etc.)

Empty groups are still included so nothing disappears silently.

---

## Requirements

- PowerShell 5.1 or PowerShell 7
- Microsoft Graph PowerShell SDK
- Delegated permissions:
  - `Group.Read.All`
  - `GroupMember.Read.All`
  - `User.Read.All`

> In locked‑down tenants, `Directory.Read.All` may also be required.

---

## The Script

```powershell
<#
.SYNOPSIS
Export members of:
  - Teams & Microsoft 365 Groups (Unified)
  - Distribution Lists
  - Security Groups

.DESCRIPTION
Uses Microsoft Graph PowerShell SDK to enumerate groups and export direct memberships.
Outputs a flattened CSV suitable for Excel.

.REQUIREMENTS
- Microsoft Graph PowerShell SDK
- Permissions (delegated):
    Group.Read.All
    GroupMember.Read.All
    User.Read.All
  (If you hit permission issues, add: Directory.Read.All)

.OUTPUT
C:\Temp\GroupExports\GroupMemberships_<timestamp>.csv
#>

Write-Host "`n=== Export Group Memberships (Teams/M365 + DLs + Security Groups) ===`n" -ForegroundColor Cyan

# ---------- Config ----------
$exportDir = "C:\Temp\GroupExports"
if (-not (Test-Path $exportDir)) { New-Item -ItemType Directory -Path $exportDir | Out-Null }
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outFile   = Join-Path $exportDir "GroupMemberships_$timestamp.csv"

# ---------- Ensure modules ----------
$mods = @(
  "Microsoft.Graph.Authentication",
  "Microsoft.Graph.Groups",
  "Microsoft.Graph.Users"
)

foreach ($m in $mods) {
  if (-not (Get-Module -ListAvailable -Name $m)) {
    Write-Host "Installing $m ..." -ForegroundColor Yellow
    Install-Module $m -Scope CurrentUser -Force -AllowClobber
  }
}
Import-Module Microsoft.Graph.Authentication -ErrorAction Stop
Import-Module Microsoft.Graph.Groups -ErrorAction Stop
Import-Module Microsoft.Graph.Users -ErrorAction Stop

# ---------- Connect ----------
try {
  Write-Host "Connecting to Microsoft Graph..." -ForegroundColor Yellow
  Connect-MgGraph -Scopes "Group.Read.All","GroupMember.Read.All","User.Read.All" -ErrorAction Stop
  $ctx = Get-MgContext
  Write-Host "✅ Connected as: $($ctx.Account)`n" -ForegroundColor Green
} catch {
  Write-Host "❌ Graph connect failed: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

# ---------- Pull groups ----------
# Grab only properties we need. We classify locally to cover all requested group types.
Write-Host "Retrieving groups..." -ForegroundColor Yellow
try {
  $allGroups = Get-MgGroup -All -Property `
    "id,displayName,mail,mailEnabled,securityEnabled,groupTypes,resourceProvisioningOptions" -ErrorAction Stop
} catch {
  Write-Host "❌ Failed to retrieve groups: $($_.Exception.Message)" -ForegroundColor Red
  Disconnect-MgGraph | Out-Null
  exit 1
}

if (-not $allGroups -or $allGroups.Count -eq 0) {
  Write-Host "⚠️ No groups found." -ForegroundColor Yellow
  Disconnect-MgGraph | Out-Null
  exit 0
}

# ---------- Classify groups ----------
function Get-GroupCategory {
  param($g)

  $isUnified = $false
  if ($g.GroupTypes) { $isUnified = ($g.GroupTypes -contains "Unified") }

  $isTeam = $false
  if ($g.ResourceProvisioningOptions) { $isTeam = ($g.ResourceProvisioningOptions -contains "Team") }

  if ($isTeam)   { return "Teams group" }
  if ($isUnified){ return "Microsoft 365 group" }

  # Distribution list: mail-enabled, not security-enabled, not Unified
  if ($g.MailEnabled -eq $true -and $g.SecurityEnabled -eq $false) { return "Distribution list" }

  # Security group: security-enabled, not Unified (mail may be true if mail-enabled security group)
  if ($g.SecurityEnabled -eq $true) { return "Security group" }

  return "Other"
}

$targetGroups = $allGroups | Where-Object {
  $cat = Get-GroupCategory $_
  $cat -in @("Teams group","Microsoft 365 group","Distribution list","Security group")
}

Write-Host ("✅ Retrieved {0} group(s) total; exporting memberships for {1} target group(s).`n" -f $allGroups.Count, $targetGroups.Count) -ForegroundColor Green

# ---------- Export memberships ----------
$results = New-Object System.Collections.Generic.List[object]
$idx = 1

foreach ($g in $targetGroups) {
  $category = Get-GroupCategory $g
  Write-Host ("[{0}/{1}] {2} ({3})" -f $idx, $targetGroups.Count, $g.DisplayName, $category) -ForegroundColor Cyan
  $idx++

  $members = @()
  try {
    $members = Get-MgGroupMember -GroupId $g.Id -All -ErrorAction Stop
  } catch {
    Write-Warning "Failed to retrieve members for [$($g.DisplayName)]: $($_.Exception.Message)"
    continue
  }

  if (-not $members -or $members.Count -eq 0) {
    $results.Add([PSCustomObject]@{
      GroupCategory     = $category
      GroupDisplayName  = $g.DisplayName
      GroupId           = $g.Id
      GroupMail         = $g.Mail
      MemberDisplayName = $null
      MemberUPN         = $null
      MemberMail        = $null
      MemberType        = "None"
      MemberId          = $null
    })
    continue
  }

  foreach ($m in $members) {
    # Type from @odata.type if present
    $odataType = $null
    if ($m.AdditionalProperties -and $m.AdditionalProperties.ContainsKey("@odata.type")) {
      $odataType = [string]$m.AdditionalProperties["@odata.type"]
    }
    $memberType = if ($odataType) { $odataType -replace '^#microsoft\.graph\.', '' } else { $m.GetType().Name }

    $memberDisplayName = $m.AdditionalProperties.displayName
    $memberMail        = $m.AdditionalProperties.mail
    $memberUPN         = $m.AdditionalProperties.userPrincipalName

    # If it's a user and UPN is missing, do a quick lookup
    if ($memberType -eq "user" -and [string]::IsNullOrWhiteSpace($memberUPN)) {
      try {
        $u = Get-MgUser -UserId $m.Id -Property "displayName,mail,userPrincipalName" -ErrorAction Stop
        if ($u) {
          if (-not $memberDisplayName) { $memberDisplayName = $u.DisplayName }
          if (-not $memberMail)        { $memberMail = $u.Mail }
          $memberUPN = $u.UserPrincipalName
        }
      } catch { }
    }

    $results.Add([PSCustomObject]@{
      GroupCategory     = $category
      GroupDisplayName  = $g.DisplayName
      GroupId           = $g.Id
      GroupMail         = $g.Mail
      MemberDisplayName = $memberDisplayName
      MemberUPN         = $memberUPN
      MemberMail        = $memberMail
      MemberType        = $memberType
      MemberId          = $m.Id
    })
  }
}

# ---------- Save ----------
$results |
  Sort-Object GroupCategory, GroupDisplayName, MemberType, MemberDisplayName |
  Export-Csv -Path $outFile -NoTypeInformation -Encoding UTF8

Write-Host "`n✅ Export complete:`n$outFile" -ForegroundColor Green
Disconnect-MgGraph | Out-Null
Write-Host "`n=== Done ===`n" -ForegroundColor Cyan
```

---

## How the Script Works

1. **Connects to Microsoft Graph** using delegated permissions
2. **Retrieves all groups** from Entra ID
3. **Classifies each group** as:
   - Teams group
   - Microsoft 365 group
   - Distribution list
   - Security group
4. **Enumerates direct members** for each group
5. **Resolves missing user properties** when Graph returns partial objects
6. **Exports a normalized CSV** sorted by group and member

Nested membership is intentionally *not* expanded to avoid ambiguity and recursion issues.

---


## Why Use Graph Instead of Exchange Cmdlets?

- Microsoft Graph covers **all group types** consistently
- No dependency on Exchange Online sessions
- Faster for large tenants
- Cleaner object model for reporting

For shared mailbox permissions or legacy Exchange‑only objects, Exchange Online PowerShell is still the right tool—but for *group membership*, Graph is the correct abstraction.

---

## Common Follow‑Ups

- Expand nested group membership
- Export one row per **user** with a list of groups
- Flag groups with no owners or no members
- Compare exports over time to detect drift

If you want any of those, this script is a solid foundation.

---