---
title: Managing Exchange Calendars
author: Tristan Madden
categories: [PowerShell]
tags: [calendars, M365, ExchangeOnlineManagement]
date: 2021-09-16
lastmod: 2023-02-08
thumbnail: "thumbnail.png"
usePageBundles: true
---

```PowerShell
#If not installed already
Install-Module ExchangeOnlineManagement
#Import
Import-Module ExchangeOnlineManagement
#Connect
Connect-ExchangeOnline -UserPrincipalName <UPN>

# Remove AccessRights from a user
Remove-MailboxFolderPermission -Identity target@company.com:\Calendar -User user@company.com
# Grant AccessRights to a user
Add-MailboxFolderPermission -Identity target@company.com:\Calendar -User user@company.com -AccessRights Owner
# See who currently has folder permissions to a user's calendar
Get-MailboxFolderPermission -Identity target@company.com:\Calendar
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