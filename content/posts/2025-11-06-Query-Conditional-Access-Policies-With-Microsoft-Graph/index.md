---
author: Tristan Madden
categories: [PowerShell]
date: 2025-11-06
draft: false
summary: "A clean PowerShell approach to export Azure AD Conditional Access policies using the Microsoft Graph SDK."
tags: ["api", "azure", "conditional-access", "automation"]
title: "Query Conditional Access Policies With Microsoft Graph"
toc: true
usePageBundles: true
---


## Overview

Managing Conditional Access policies in Microsoft 365 can get messy when older versions of the Microsoft Graph PowerShell SDK modules conflict or fail to import correctly. This PowerShell script offers a **fully automated reset and export process**, removing all existing Graph modules, installing only the required ones, and exporting Conditional Access policies to JSON files for documentation or backup.

This is particularly useful when your Microsoft Graph environment becomes unstable or bloated after multiple updates, or when you just need a clean baseline for auditing Conditional Access.

---

## Key Features

- **Cleans up all Microsoft.Graph modules** silently.
- **Installs only minimal dependencies** (`Microsoft.Graph.Authentication` and `Microsoft.Graph.Identity.SignIns`).
- **Connects securely to Microsoft Graph** with the proper scopes.
- **Retrieves and exports all Conditional Access policies** individually and as a combined JSON file.
- **Creates a clean export directory** (`C:\Temp\ConditionalAccessPolicies`).

---

## The PowerShell Script

```powershell
<#
.SYNOPSIS
Fully resets Microsoft Graph PowerShell SDK modules and exports Conditional Access policies cleanly.
#>

Write-Host "`n=== Microsoft Graph Cleanup and Conditional Access Export ===" -ForegroundColor Cyan

# Step 1: Uninstall all Graph modules (silently)
Write-Host "`nRemoving all Microsoft.Graph modules..." -ForegroundColor Yellow
Get-Module Microsoft.Graph* -ListAvailable | ForEach-Object {
    try {
        Write-Host " - Removing $($_.Name)" -ForegroundColor DarkGray
        Uninstall-Module $_.Name -AllVersions -Force -ErrorAction SilentlyContinue
    } catch {}
}

# Step 2: Install only the required core and identity modules
Write-Host "`nInstalling minimal modules..." -ForegroundColor Yellow
Install-Module Microsoft.Graph.Authentication -Scope CurrentUser -Force -AllowClobber
Install-Module Microsoft.Graph.Identity.SignIns -Scope CurrentUser -Force -AllowClobber

Import-Module Microsoft.Graph.Authentication
Import-Module Microsoft.Graph.Identity.SignIns

# Step 3: Connect to Graph
Write-Host "`nConnecting to Microsoft Graph..." -ForegroundColor Cyan
Connect-MgGraph -Scopes "Policy.Read.All","Policy.Read.ConditionalAccess"
$ctx = Get-MgContext
Write-Host "âœ… Connected as: $($ctx.Account)" -ForegroundColor Green

# Step 4: Retrieve policies
Write-Host "`nRetrieving Conditional Access policies..." -ForegroundColor Cyan
$Policies = Get-MgIdentityConditionalAccessPolicy -All

if (-not $Policies -or $Policies.Count -eq 0) {
    Write-Host "âš ï¸  No Conditional Access policies found or insufficient permissions." -ForegroundColor Yellow
    Disconnect-MgGraph
    return
}

Write-Host "`nâœ… Retrieved $($Policies.Count) Conditional Access policy(ies):" -ForegroundColor Green
$Policies | ForEach-Object { Write-Host "   - $($_.DisplayName) [$($_.State)]" }

# Step 5: Export policies
$ExportPath = "C:\Temp\ConditionalAccessPolicies"
if (!(Test-Path $ExportPath)) { New-Item -ItemType Directory -Path $ExportPath | Out-Null }

foreach ($p in $Policies) {
    $SafeName = ($p.DisplayName -replace '[^a-zA-Z0-9-_]', '_')
    if ([string]::IsNullOrWhiteSpace($SafeName)) { $SafeName = "UnnamedPolicy_$([guid]::NewGuid().ToString())" }
    $File = Join-Path $ExportPath "$SafeName.json"
    $p | ConvertTo-Json -Depth 10 | Out-File $File -Encoding UTF8
    Write-Host "âœ… Exported: $($p.DisplayName)" -ForegroundColor Green
}

$Combined = Join-Path $ExportPath "All_ConditionalAccessPolicies.json"
$Policies | ConvertTo-Json -Depth 10 | Out-File $Combined -Encoding UTF8
Write-Host "`nâœ… Combined export saved to: $Combined" -ForegroundColor Green

Disconnect-MgGraph
Write-Host "`n=== Export Complete ===" -ForegroundColor Cyan
```

---

## How to Use

1. **Open PowerShell as Administrator.**
2. Copy and paste the script above into your session or save it as `Export-ConditionalAccess.ps1`.
3. Run the script:
   ```powershell
   .\Export-ConditionalAccess.ps1
   ```
4. When prompted, **sign in with an account** that has permission to read Conditional Access policies (e.g., Global Administrator, Security Administrator).
5. The policies will be saved as individual `.json` files and as a combined export at:
   ```
   C:\Temp\ConditionalAccessPolicies
   ```

---

## Example Output

```
=== Microsoft Graph Cleanup and Conditional Access Export ===
Removing all Microsoft.Graph modules...
 - Removing Microsoft.Graph.Authentication
 - Removing Microsoft.Graph.Users

Installing minimal modules...
Connecting to Microsoft Graph...
âœ… Connected as: admin@contoso.com

Retrieving Conditional Access policies...
âœ… Retrieved 4 Conditional Access policy(ies):
   - Block Legacy Auth [enabled]
   - Require MFA for Admins [enabled]
   - Require Compliant Device [enabled]
   - Block International Sign-ins [reportOnly]

âœ… Exported: Block Legacy Auth
âœ… Exported: Require MFA for Admins
âœ… Combined export saved to: C:\Temp\ConditionalAccessPolicies\All_ConditionalAccessPolicies.json
=== Export Complete ===
```

---

## Why This Matters

Conditional Access policies are the backbone of Microsoft 365 security posture. Backing them up regularly provides:

- **Disaster recovery protection** in case of accidental deletions or corruption.
- **Change tracking** for audit and compliance teams.
- **Ease of migration** when moving tenants or auditing configurations.

This script automates the otherwise tedious process of resetting and exporting, ensuring **clean module states** and **consistent policy exports** every time.

---

## Related Commands

- `Get-MgIdentityConditionalAccessPolicy` â€” Retrieves Conditional Access policies.
- `Connect-MgGraph` â€” Establishes the connection to Microsoft Graph API.
- `Uninstall-Module` / `Install-Module` â€” Manages PowerShell modules.

---

