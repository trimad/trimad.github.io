---
author: Tristan Madden
categories: [PowerShell]
date: 2023-05-02
draft: false
tags: [acl, permissions]
title: ACL
thumbnail: "thumbnail.png"
summary: A collection of PowerShell scripts useful for managing the Access Control List (ACL)
usePageBundles: true
toc: true
---

## Get ACL permissions

1. The script retrieves the Access Control List (ACL) for a specified UNC path, resolving the Security Identifiers (SIDs) to their corresponding account names.
2. It provides a plain-text description of the access rights (e.g., read or write) associated with each account.
3. The output, including the SID, account name, and access rights, is saved to a CSV file for further analysis or reporting.

```PowerShell
function Get-AccessDescription($AccessMask) {
    $AccessRights = @()

    if ($AccessMask -band 0x1) { $AccessRights += "ReadData (List Directory)" }
    if ($AccessMask -band 0x2) { $AccessRights += "WriteData (Create Files)" }
    if ($AccessMask -band 0x4) { $AccessRights += "AppendData (Create Folders)" }
    if ($AccessMask -band 0x8) { $AccessRights += "ReadExtendedAttributes" }
    if ($AccessMask -band 0x10) { $AccessRights += "WriteExtendedAttributes" }
    if ($AccessMask -band 0x20) { $AccessRights += "ExecuteFile (Traverse Folder)" }
    if ($AccessMask -band 0x40) { $AccessRights += "DeleteSubdirectoriesAndFiles" }
    if ($AccessMask -band 0x80) { $AccessRights += "ReadAttributes" }
    if ($AccessMask -band 0x100) { $AccessRights += "WriteAttributes" }
    if ($AccessMask -band 0x10000) { $AccessRights += "Delete" }
    if ($AccessMask -band 0x20000) { $AccessRights += "ReadControl" }
    if ($AccessMask -band 0x40000) { $AccessRights += "WriteDACL" }
    if ($AccessMask -band 0x80000) { $AccessRights += "WriteOwner" }
    if ($AccessMask -band 0x100000) { $AccessRights += "Synchronize" }

    return ($AccessRights -join ', ')
}

$Path = "\\server\share"
$OutputFile = "AccessList.csv"
$ACL = Get-Acl -Path $Path
$AccessList = @()

foreach ($ACE in $ACL.Access) {
    try {
        $Account = $ACE.IdentityReference.Value
        $SID = (New-Object System.Security.Principal.NTAccount($Account)).Translate([System.Security.Principal.SecurityIdentifier]).Value
        $AccessDescription = Get-AccessDescription $ACE.FileSystemRights

        $AccessEntry = New-Object PSObject -Property @{
            SID = $SID
            AccountName = $Account
            AccessRights = $AccessDescription
        }
        $AccessList += $AccessEntry
    } catch {
        $AccessEntry = New-Object PSObject -Property @{
            SID = "Not found or not resolvable"
            AccountName = "Not found or not resolvable"
            AccessRights = "Not found or not resolvable"
        }
        $AccessList += $AccessEntry
    }
}

$AccessList | Export-Csv -Path $OutputFile -NoTypeInformation

```

## Set ACL permissions

{{% notice warning "WARNING" %}}
This is untested!
{{% /notice %}}

### Full Control
```PoweShell
(Get-Acl -Path "\\server\share").AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule("<SID>", "FullControl", "Allow"))) | Set-Acl -Path "\\server\share"
```

### Modify
```PoweShell
(Get-Acl -Path "\\server\share").AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule("<SID>", "Modify", "Allow"))) | Set-Acl -Path "\\server\share"
```

### Read & Execute
```PowerShell
(Get-Acl -Path "\\server\share").AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule("<SID>", "ReadAndExecute", "Allow"))) | Set-Acl -Path "\\server\share"
```

### List Folder Contents
```PowerShell
(Get-Acl -Path "\\server\share").AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule("<SID>", "ListDirectory", "Allow"))) | Set-Acl -Path "\\server\share"
```

### Read
```PowerShell
(Get-Acl -Path "\\server\share").AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule("<SID>", "Read", "Allow"))) | Set-Acl -Path "\\server\share"
```

### Write
```PowerShell
(Get-Acl -Path "\\server\share").AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule("<SID>", "Write", "Allow"))) | Set-Acl -Path "\\server\share"

```