---
title: "Export Shared Mailbox Delegates from Exchange Online (and Why PowerShell ISE Breaks It)"
date: 2026-01-09
description: "A PowerShell 5.1 script to export Shared Mailbox permissions from Exchange Online, and why it must relaunch itself out of PowerShell ISE."
tags: ["powershell", "exchange-online", "microsoft-365", "sysadmin", "automation"]
categories: ["PowerShell", "Microsoft 365"]
draft: false
---

## The problem

I needed a **single, reliable export** of all **Shared Mailboxes** in Exchange Online and **who can access them**, specifically:

- **Full Access**
- **Send As**
- **Send on Behalf**

This is deceptively annoying in Exchange Online because those permissions live in **three different places**:

| Permission Type | Where it lives |
|-----------------|---------------|
| Full Access | `Get-MailboxPermission` |
| Send As | `Get-RecipientPermission` |
| Send on Behalf | `GrantSendOnBehalfTo` |

On top of that, I’m running **Windows PowerShell 5.1**, not PowerShell 7, and I routinely work out of **PowerShell ISE**.

That combination introduces a very specific authentication problem.

---

## Why PowerShell ISE breaks Exchange Online authentication

Short version:

> **PowerShell ISE does not provide a real interactive window handle**, and modern Exchange Online authentication *expects one*.

Longer version:

- `Connect-ExchangeOnline` uses **modern authentication (MSAL / WAM)** under the hood.
- That auth stack expects to attach to a **real console window** for sign-in prompts.
- PowerShell ISE runs in a **hosted editor process**, not a normal console.
- The result is errors like:
  - *“A window handle must be configured”*
  - Silent authentication failures
  - Or the session simply exiting

Even worse, different versions of the `ExchangeOnlineManagement` module expose **different parameters**:
- Some have `-Device`
- Some have `-UseWebLogin`
- Older ones have **neither**

ISE makes all of this more fragile.

---

## The pragmatic solution

Instead of fighting ISE, the script does something very deliberate:

1. **Detects when it’s running inside PowerShell ISE**
2. **Spawns a real `powershell.exe` console**
3. **Re-runs itself there**
4. Keeps the window open so you can see errors or output

This avoids:
- MSAL window handle issues
- Partial authentication failures
- “It worked yesterday” module version roulette

ISE becomes the **editor**, not the runtime.

---

## What the script does

- Uses **no `[CmdletBinding()]`**
- Uses **no `param()` block**
- Works in **PowerShell 5.1**
- Exports **one CSV only**:

```
C:\temp\SharedMailboxes.csv
```

- Resolves delegates to:
  - Display name
  - Primary SMTP address
  - Recipient type
- Filters out noise like:
  - `NT AUTHORITY\SELF`
  - Exchange system principals (unless you explicitly allow them)

---

## The script

```powershell
<#
Shared mailbox delegate export (WinPS 5.1)

- NO [CmdletBinding()] and NO param() block
- Exports ONLY:
    C:\temp\SharedMailboxes.csv
- Captures:
    * Full Access
    * Send As
    * Send on Behalf
- Auto re-launches out of PowerShell ISE into console and keeps it open
#>

# ===================== SETTINGS =====================
$AdminUPN                = $null
$OutputPath              = "C:\temp"
$IncludeInherited        = $false
$IncludeSystemPrincipals = $false
# ====================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Tls12 {
    try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}
}

function Ensure-ExchangeOnlineModule {
    if (-not (Get-Module -ListAvailable -Name ExchangeOnlineManagement)) {
        throw "ExchangeOnlineManagement module not found."
    }
    Import-Module ExchangeOnlineManagement -ErrorAction Stop | Out-Null
}

function Connect-EXO {
    param([string]$AdminUPN)

    $cmd = Get-Command Connect-ExchangeOnline -ErrorAction Stop
    $params = @{ ShowBanner = $false }

    if ($AdminUPN -and $cmd.Parameters.ContainsKey('UserPrincipalName')) {
        $params['UserPrincipalName'] = $AdminUPN
    }

    Connect-ExchangeOnline @params
}

function Should-IncludePrincipal {
    param([string]$Principal)

    if ($IncludeSystemPrincipals) { return $true }
    if ($Principal -match '^NT AUTHORITY\\SELF$') { return $false }
    if ($Principal -match '^NT AUTHORITY\\SYSTEM$') { return $false }
    if ($Principal -match '^S-1-5-') { return $false }
    if ($Principal -match '^Microsoft Exchange$') { return $false }
    if ($Principal -match '^ExchangeOnlineProtection\\') { return $false }
    return $true
}

$script:RecipientCache = @{}
function Resolve-RecipientCached {
    param([string]$Identity)

    if ($script:RecipientCache.ContainsKey($Identity)) {
        return $script:RecipientCache[$Identity]
    }

    try {
        $r = Get-Recipient -Identity $Identity -ErrorAction Stop
        $obj = [pscustomobject]@{
            DisplayName          = $r.DisplayName
            PrimarySmtpAddress   = $r.PrimarySmtpAddress.ToString()
            RecipientTypeDetails = $r.RecipientTypeDetails
        }
    } catch {
        $obj = [pscustomobject]@{
            DisplayName          = $Identity
            PrimarySmtpAddress   = ""
            RecipientTypeDetails = ""
        }
    }

    $script:RecipientCache[$Identity] = $obj
    return $obj
}

# -------------------- ISE auto re-launch --------------------
if ($Host.Name -like "*ISE*") {
    $escaped = $PSCommandPath.Replace("'", "''")
    Start-Process powershell.exe -ArgumentList @(
        '-NoExit','-ExecutionPolicy','Bypass','-NoProfile',
        '-Command', "& '$escaped'; Write-Host 'Press Enter to close'; Read-Host"
    )
    return
}

# -------------------- main --------------------
Ensure-Tls12
Ensure-ExchangeOnlineModule

if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath | Out-Null
}

Write-Host "Connecting to Exchange Online..." -ForegroundColor Cyan
Connect-EXO -AdminUPN $AdminUPN

$detail = New-Object System.Collections.Generic.List[object]

$sharedMbx = Get-Mailbox -RecipientTypeDetails SharedMailbox -ResultSize Unlimited

foreach ($mbx in $sharedMbx) {
    $id = $mbx.Identity
    $primary = $mbx.PrimarySmtpAddress.ToString()

    Get-MailboxPermission $id | Where-Object {
        $_.AccessRights -contains "FullAccess" -and -not $_.IsInherited -and -not $_.Deny
    } | ForEach-Object {
        if (Should-IncludePrincipal $_.User) {
            $r = Resolve-RecipientCached $_.User
            $detail.Add([pscustomobject]@{
                Mailbox        = $primary
                PermissionType = "FullAccess"
                DelegateName   = $r.DisplayName
                DelegateSMTP   = $r.PrimarySmtpAddress
                DelegateType   = $r.RecipientTypeDetails
            })
        }
    }

    Get-RecipientPermission $id | Where-Object {
        $_.AccessRights -contains "SendAs"
    } | ForEach-Object {
        if (Should-IncludePrincipal $_.Trustee) {
            $r = Resolve-RecipientCached $_.Trustee
            $detail.Add([pscustomobject]@{
                Mailbox        = $primary
                PermissionType = "SendAs"
                DelegateName   = $r.DisplayName
                DelegateSMTP   = $r.PrimarySmtpAddress
                DelegateType   = $r.RecipientTypeDetails
            })
        }
    }

    foreach ($sob in $mbx.GrantSendOnBehalfTo) {
        if (Should-IncludePrincipal $sob) {
            $r = Resolve-RecipientCached $sob
            $detail.Add([pscustomobject]@{
                Mailbox        = $primary
                PermissionType = "SendOnBehalf"
                DelegateName   = $r.DisplayName
                DelegateSMTP   = $r.PrimarySmtpAddress
                DelegateType   = $r.RecipientTypeDetails
            })
        }
    }
}

$detail | Export-Csv -NoTypeInformation -Encoding UTF8 -Path "$OutputPath\SharedMailboxes.csv"

Write-Host "Export complete: $OutputPath\SharedMailboxes.csv" -ForegroundColor Green
```

---

## Final notes

- **ISE is fine for writing PowerShell**
- **ISE is not fine for modern cloud authentication**
- Relaunching into a real console is not a hack — it’s a **deliberate boundary between editor and runtime**

If Microsoft ever retrofits ISE with proper WAM support (they won’t), this wouldn’t be necessary. Until then, this approach is stable, repeatable, and boring — which is exactly what you want in admin scripts.
