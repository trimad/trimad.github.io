---
title: Managing Exchange Calendars
author: Tristan Madden
date: 2021-09-16
draft: false
tags: [calendars, M365, ExchangeOnlineManagement]
categories: [PowerShell]
summary: "A collection of PowerShell scripts using ExchangeOnlineManagement module to manage calendar permissions in Exchange Online, including bulk operations for granting, modifying, and viewing access rights across multiple mailboxes."
usePageBundles: true
toc: true
---

```PowerShell
#If not installed already
Install-Module ExchangeOnlineManagement
#Import
Import-Module ExchangeOnlineManagement
#Connect
Connect-ExchangeOnline -ShowBanner:$false

# Remove AccessRights from a user
Remove-MailboxFolderPermission -Identity target@company.com:\Calendar -User user@company.com
# Grant AccessRights to a user
Add-MailboxFolderPermission -Identity target@company.com:\Calendar -User user@company.com -AccessRights Owner
# See who currently has folder permissions to a user's calendar
Get-MailboxFolderPermission -Identity target@company.com:\Calendar
```

## Hunting for Calendar Permissions

 There isn't a direct single cmdlet that lists all calendars a user has access to across other mailboxes. Therefore, you have to iterate across all mailboxes in a `foreach` loop. Here is my current solution. It takes a very long time to run.

### Specific Mailboxes

 ```PowerShell
# Import and Connect
Import-Module ExchangeOnlineManagement
Connect-ExchangeOnline -ShowBanner:$false

$mailboxes = @(
    "",
    "",
    ""
)

# A limitation of this script is that it has to check against the username and not the SMTP address.
$userToCheck = "First Last"
$report = @()

foreach ($mailbox in $mailboxes) {
    $permission = Get-MailboxFolderPermission -Identity "${mailbox}:\Calendar" |
        Where-Object { $_.User.ToString().Trim() -like "*$userToCheck*" }

    if ($permission) {
        foreach ($perm in $permission) {
            $report += [PSCustomObject]@{
                'Mailbox'      = $mailbox
                'User'         = $perm.User
                'AccessRights' = ($perm.AccessRights -join ', ')
            }
        }
    }
}

if ($report.Count -eq 0) {
    $report += [PSCustomObject]@{
        'Mailbox'      = "No permissions found for $userToCheck"
        'User'         = ""
        'AccessRights' = ""
    }
}

# HTML + CSS styling
$css = @"
<style>
body { font-family: Segoe UI, Arial, sans-serif; background: #f7f9fa; margin: 30px; }
h2   { color: #22223b; }
table { border-collapse: collapse; width: 80%; box-shadow: 0 2px 6px #ccc; margin: 20px 0; }
th, td { padding: 12px 16px; text-align: left; }
th { background-color: #232946; color: #fff; letter-spacing: 0.5px; }
tr:nth-child(even) { background-color: #e7eaf6; }
tr:nth-child(odd) { background-color: #fff; }
td { border-bottom: 1px solid #d9dbe2; }
</style>
"@

$html = $report | Sort-Object Mailbox | ConvertTo-Html -Title "Calendar Permissions Report" -PreContent "<h2>Permissions for $userToCheck</h2>$css"

# Output and open
$OutPath = "$env:TEMP\CalendarPermissionsReport.html"
$html | Out-File -Encoding UTF8 $OutPath
Start-Process $OutPath
```

### All Mailboxes

 ```PowerShell
$userToCheck = "ycooper@maryhaven.com"



# Import and Connect
Import-Module ExchangeOnlineManagement
Connect-ExchangeOnline -ShowBanner:$false

$mailBoxList = Get-Mailbox -ResultSize Unlimited | Where-Object { $_.AccountDisabled -eq $false }
$totalMailBoxes = $mailBoxList.Count
Write-Host "Total enabled user mailboxes found: $totalMailBoxes"
$mailboxToCheck = Get-Mailbox -Identity $userToCheck | Format-List *
$reportList = @()

foreach ($mailBox in $mailBoxList) {
    
    $uniqueId = $mailBox.PrimarySmtpAddress.ToString().Trim('{}')
    Write-Host $uniqueId

    $folderPermission = Get-MailboxFolderPermission -Identity "${uniqueId}:\Calendar" -ErrorAction SilentlyContinue |
        Where-Object { $_.User.ToString().Trim() -eq (Get-Mailbox -Identity $userToCheck).Name }

    if ($folderPermission) {
        foreach ($perm in $folderPermission) {
            $reportList += [PSCustomObject]@{
                'Mailbox'      = $uniqueId
                'User'         = $perm.User
                'AccessRights' = ($perm.AccessRights -join ', ')
            }
        }
    }
}

if ($reportList.Count -eq 0) {
    $reportList += [PSCustomObject]@{
        'Mailbox'      = "No permissions found for $userToCheck"
        'User'         = ""
        'AccessRights' = ""
    }
}

# HTML + CSS styling
$cssStyle = @"
<style>
body { font-family: Segoe UI, Arial, sans-serif; background: #f7f9fa; margin: 30px; }
h2   { color: #22223b; }
table { border-collapse: collapse; width: 80%; box-shadow: 0 2px 6px #ccc; margin: 20px 0; }
th, td { padding: 12px 16px; text-align: left; }
th { background-color: #232946; color: #fff; letter-spacing: 0.5px; }
tr:nth-child(even) { background-color: #e7eaf6; }
tr:nth-child(odd) { background-color: #fff; }
td { border-bottom: 1px solid #d9dbe2; }
</style>
"@

$htmlReport = $reportList | Sort-Object Mailbox | ConvertTo-Html -Title "Calendar Permissions Report" -PreContent "<h2>Permissions for $userToCheck</h2>$cssStyle"

# Output and open
$outFilePath = "$env:TEMP\CalendarPermissionsReport.html"
$htmlReport | Out-File -Encoding UTF8 $outFilePath
Start-Process $outFilePath

```

I haven't tested these since 2021:

```PowerShell
# Connect to Exchage
Import-Module ExchangeOnlineManagement
Connect-ExchangeOnline -UserPrincipalName <UPN>

# Get a list of all mailbox aliases
# Source: https://docs.microsoft.com/en-us/powershell/module/exchange/get-mailbox?view=exchange-ps
$users = Get-Mailbox | Select -ExpandProperty Alias

# Add AccessRights for a user to all mailboxes
# Source: https://docs.microsoft.com/en-us/powershell/module/exchange/add-mailboxfolderpermission?view=exchange-ps
Foreach ($user in $users) {Add-MailboxFolderPermission $user":\Calendar" -User <UPN> -AccessRights PublishingEditor}

# Set AccessRights to a user for all mailboxes. You would do this if AccessRights already exist and you need to overwrite them.
# Source: https://docs.microsoft.com/en-us/powershell/module/exchange/set-mailboxfolderpermission?view=exchange-ps
Foreach ($user in $users) {Set-MailboxFolderPermission $user":\Calendar" -User <UPN> -AccessRights PublishingEditor}

# Get the current access rights this user has for all mailboxes.
# Source: https://docs.microsoft.com/en-us/powershell/module/exchange/get-mailboxfolderpermission?view=exchange-ps
Foreach ($user in $users) {Get-MailboxFolderPermission $user":\Calendar" -User <UPN>}
```