---
author: Tristan Madden
categories: [PowerShell]
date: 2023-02-23
tags: [passwords]
title: Microsoft LAPS (Local Administrator Password Solution)
thumbnail: "thumbnail.png"
summary: Microsoft LAPS (Local Administrator Password Solution) is a tool designed to securely manage local administrator account passwords on Windows domain-joined computers. It automates password generation and rotation, and stores passwords in a secure manner, providing greater control and security over local accounts.
usePageBundles: true
---

Microsoft LAPS (Local Administrator Password Solution) is a tool designed to securely manage local administrator account passwords on Windows domain-joined computers. It automates password generation and rotation, and stores passwords in a secure manner, providing greater control and security over local accounts.

<h3>Get the local admin password for 1 computer</h3>

_from Active Directory PowerShell:_

```PowerShell
Get-AdmPwdPassword -ComputerName <computername>
```

<h3>Get the OU and DC info for a computer</h3>

_from Active Directory PowerShell:_

```PowerShell
Get-ADComputer -Identity <computername> -Properties DistinguishedName,DNSHostName
```

<h3>Get the local admin password for all computers</h3>

_from Active Directory PowerShell:_

```PowerShell
Get-ADComputer -Filter * -SearchBase “OU=,DC=,DC=,DC=” | Get-AdmPwdPassword -ComputerName {$_.Name}
```