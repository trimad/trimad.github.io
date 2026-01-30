---
author: "Tristan Madden"
categories:
  - PowerShell
date: 2026-01-30
description: "Bulk reset Active Directory user passwords for every account in a specific OU, export results to CSV, and log the exact target list for auditability."
draft: false
tags:
  - ActiveDirectory
  - DomainController
  - ADUC
  - Security
  - Automation
  - PasswordReset
  - IncidentResponse
title: "Reset Passwords For All Users in an OU"
toc: true
---

{{< notice type="warning" title="AI-Generated Content" >}}
This PowerShell script and description are AI-generated. Please review for completeness and accuracy.
{{< /notice >}}

{{< notice type="info" title="AI-Generated Content" >}}
This script was last tested and verified to work by a human on 1/30/2026. 
{{< /notice >}}

## What this does

This post documents a **domain-controller-friendly** PowerShell script that:

- Finds **all user objects** in a given OU (via LDAP filter)
- Generates a new password for each user using a **hard-coded word list** + **9 digits**
- Resets each password with `Set-ADAccountPassword`
- Forces **Change password at next logon**
- Exports a CSV containing:
  - `Username` (sAMAccountName)
  - `Password` (plaintext — see security notes)
  - `ResetSucceeded` and error details
- Logs (to transcript) the **exact target list** before any changes are made

> ⚠️ Security note: This produces a CSV containing **plaintext passwords**. Treat it like a credential dump: restrict NTFS permissions, move it securely, and delete it as soon as it’s no longer needed.

---

## The gotcha: PowerShell ISE vs PowerShell

In this environment, running the script from **PowerShell ISE** repeatedly produced:

- `Set-ADAccountPassword : Access is denied`

Even with the same credentials, the script worked when executed from a **Windows PowerShell console (`powershell.exe`)**.

If you run into the same thing:

1. Try a regular **PowerShell** session (not ISE).
2. Run it elevated.
3. Confirm your admin groups are not “deny only”:

```powershell
whoami /groups | findstr /i "domain admins enterprise admins schema admins"
```

---

## Requirements

- Run on a **Domain Controller** or a machine with **RSAT** installed
- `ActiveDirectory` PowerShell module available
- Permissions to reset passwords for users in the target OU

---

## Password time complexity

The generated password format is:

- 1 word selected uniformly from a hard-coded list of **50** words
- followed by **9 digits** (`000000000` through `999999999`)

That means the total number of possible passwords (the **search space**) is:

- Words: `50`
- Digit combinations: `10^9`
- Total: `50 × 10^9 = 5 × 10^10` possibilities

If an attacker knows the exact pattern and has the full word list, a targeted brute-force attack against this scheme is **linear in the search space**, i.e.:

- **Time complexity:** `O(5 × 10^10)` guesses (same order as `O(10^10)`)

### What that means in practice

- **Online guessing (against login prompts):** Real-world time is dominated by rate limits, lockouts, and MFA, so brute forcing is generally infeasible.
- **Offline cracking (if hashes are stolen):** Attack feasibility depends heavily on the hash type and attacker hardware. Fast hashes (like NTLM) can be tested very quickly, so the real protection is:
  - forcing password change at next logon (this script does),
  - enforcing MFA,
  - and preventing leakage of the plaintext CSV.

### If you want a larger search space

You can increase the search space by adding more digits or more words:

- Add 1 digit → multiply space by **10**
- Double word list size → multiply space by **2**

Example target:
- **~10^12**: 100 words + 10 digits → `100 × 10^10 = 10^12`

---

## The script

> Start with `$AuditOnly = $true` to validate the target list and output paths.  
> Flip to `$false` only when you’re ready to execute.

```powershell
# =======================
# SAFETY TOGGLE (EDIT ME)
# =======================
$AuditOnly = $true   # <-- set to $false to actually reset passwords

# =======================
# Target OU + Output Files
# =======================
$OuDN      = "OU=Users,OU=Company,DC=example,DC=local"
$OutCsv    = "C:\Temp\Company_OU_PasswordReset_{0}.csv" -f (Get-Date -Format "yyyyMMdd_HHmmss")
$LogFile   = "C:\Temp\Company_OU_PasswordReset_{0}.log" -f (Get-Date -Format "yyyyMMdd_HHmmss")

# Ensure output folder exists
$null = New-Item -Path (Split-Path $OutCsv) -ItemType Directory -Force -ErrorAction SilentlyContinue

Start-Transcript -Path $LogFile -Force | Out-Null

# =======================
# Hard-coded password words
# =======================
$Words = @(
  "Nimbus",
  "Velocity",
  "Cobalt",
  "Juniper",
  "Phoenix",
  "Cascade",
  "Harbor",
  "Summit",
  "Orbit",
  "Citrine",
  "Voyager",
  "Aurora",
  "Granite",
  "Meadow",
  "Sterling",
  "Echoes",
  "Raptor",
  "Willow",
  "Atlas",
  "Banyan",
  "Zephyr",
  "Pinnacle",
  "Saffron",
  "Mariner",
  "Quartz",
  "Glacier",
  "Ember",
  "Prairie",
  "Timber",
  "Coral",
  "Vortex",
  "Lattice",
  "Riviera",
  "Sierra",
  "Horizon",
  "Solstice",
  "Monarch",
  "Crescent",
  "Radiant",
  "Pioneer",
  "Evergreen",
  "Tempest",
  "Sequoia",
  "Thunder",
  "Mirage",
  "Oasis",
  "Citadel",
  "Helios",
  "Canyon",
  "Starlight"
)

function New-Password {
  param([string[]]$WordList)
  $word   = $WordList | Get-Random
  $digits = (Get-Random -Minimum 0 -Maximum 1000000000).ToString("000000000") # 9 digits
  return "$word$digits"
}

Import-Module ActiveDirectory -ErrorAction Stop

# =======================
# Pull users from OU
# =======================
$users = Get-ADUser -SearchBase $OuDN -LDAPFilter "(&(objectCategory=person)(objectClass=user))" `
  -Properties Enabled,DistinguishedName,sAMAccountName,UserPrincipalName

Write-Host "Found $($users.Count) user(s) under: $OuDN"
Write-Host "AuditOnly = $AuditOnly"
Write-Host "Output CSV: $OutCsv"
Write-Host "Log File : $LogFile"

# =======================
# Log which accounts will be hit (captured by transcript)
# =======================
$targetList = $users |
  Select-Object Name,sAMAccountName,UserPrincipalName,Enabled,DistinguishedName |
  Sort-Object Name

Write-Host "`n=== TARGET ACCOUNTS ($($targetList.Count)) ==="
$targetList | Format-Table -Auto | Out-String | Write-Host
Write-Host "=== END TARGET ACCOUNTS ===`n"

# =======================
# Reset loop
# =======================
$results = New-Object System.Collections.Generic.List[object]

foreach ($u in $users) {
  $newPw = New-Password -WordList $Words

  $row = [pscustomobject]@{
    Username          = $u.sAMAccountName
    Password          = $newPw
    Enabled           = $u.Enabled
    ResetAttempted    = $false
    ResetSucceeded    = $false
    Notes             = ""
    DistinguishedName = $u.DistinguishedName
  }

  try {
    if ($AuditOnly) {
      $row.Notes = "AuditOnly: no changes made."
    } else {
      $securePw = ConvertTo-SecureString -String $newPw -AsPlainText -Force

      Set-ADAccountPassword -Identity $u.DistinguishedName -Reset -NewPassword $securePw -ErrorAction Stop
      $row.ResetAttempted = $true

      Set-ADUser -Identity $u.DistinguishedName -ChangePasswordAtLogon $true -ErrorAction Stop

      $row.ResetSucceeded = $true
      $row.Notes = "Password reset + ChangePasswordAtLogon set."
    }
  }
  catch {
    $row.ResetAttempted = (-not $AuditOnly)
    $row.ResetSucceeded = $false
    $row.Notes = $_.Exception.Message
    Write-Host "FAILED: $($u.sAMAccountName) - $($_.Exception.Message)" -ForegroundColor Red
  }

  $results.Add($row) | Out-Null
}

$results | Export-Csv -Path $OutCsv -NoTypeInformation -Encoding UTF8

Stop-Transcript | Out-Null

Write-Host "`nDone."
Write-Host "CSV: $OutCsv"
Write-Host "Log: $LogFile"
```

---

## How to run it

1. Copy the script to the DC (or a machine with RSAT).
2. Start with **AuditOnly mode**:
   - Leave `$AuditOnly = $true`
   - Run once to confirm the **TARGET ACCOUNTS** list is correct.
3. Execute the reset:
   - Set `$AuditOnly = $false`
   - Run again.

### Validate output files

- CSV: `C:\Temp\Company_OU_PasswordReset_YYYYMMDD_HHMMSS.csv`
- Log: `C:\Temp\Company_OU_PasswordReset_YYYYMMDD_HHMMSS.log`

---

## Operational safety notes

### Plaintext password CSV handling

This is the biggest risk. At minimum:

- Restrict NTFS permissions to only the admins who need it
- Transfer it using a secure method (avoid chat, plain email, and shared links)
- Delete it as soon as you no longer need it

### Excluding admin or service accounts

If your OU contains accounts like `*admin*`, `*svc*`, or other service principals, consider:

- Moving service accounts out of the OU used for bulk resets, or
- Filtering them out before the reset loop

### Only target enabled users (optional)

If you want to reset **only enabled** accounts, change the LDAP filter to:

```powershell
$users = Get-ADUser -SearchBase $OuDN -LDAPFilter "(&(objectCategory=person)(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))" `
  -Properties Enabled,DistinguishedName,sAMAccountName,UserPrincipalName
```

---

## Wrap-up

This approach is a reliable way to do a **controlled mass password reset** in a single OU while keeping:

- An auditable “target list” (transcript)
- A structured CSV export
- A log trail for review/troubleshooting

If you want to extend it, easy upgrades include:

- Adding an explicit denylist of usernames to exclude
- Exporting the target list to a separate approval CSV
- Switching password generation to a stricter policy (length/complexity)
