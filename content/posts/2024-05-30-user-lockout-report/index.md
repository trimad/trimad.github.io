---
author: Tristan Madden
categories: [PowerShell]
date: 2024-05-30
lastmod: 2024-06-28
draft: false
featured: false
summary: "This PowerShell script generates an HTML diagnostics report for user lockouts in the Active Directory. The script imports the Active Directory module and retrieves all user accounts that are not disabled. It fetches password-related properties and calculates the password age and expiration details for each user. The results are filtered, sorted, and converted into an HTML report with CSS styling for better readability. The final HTML report is saved to a file and opened in the default web browser."
tags: [PowerShell]
thumbnail: "thumbnail.png"
title: "User Lockout Report"
toc: true
usePageBundles: true
---

This PowerShell script generates an HTML diagnostics report for user lockouts in the Active Directory. The script imports the Active Directory module and retrieves all user accounts that are not disabled. It fetches password-related properties and calculates the password age and expiration details for each user. The results are filtered, sorted, and converted into an HTML report with CSS styling for better readability. The final HTML report is saved to a file and opened in the default web browser.

```PowerShell
# Import the Active Directory module
Import-Module ActiveDirectory

# Get all users who are not disabled
$users = Get-ADUser -Filter * -Property pwdLastSet, Enabled, LockedOut, PasswordExpired, WhenCreated, LastLogonDate

# Get the result of `net accounts`
$netAccounts = net accounts
$maxPwdAgeLine = $netAccounts | Select-String -Pattern "Maximum password age"
$maxPwdAgeValue = ($maxPwdAgeLine -split "\s+")[4] # Extract the value from the line

# Handle the "Unlimited" case
if ($maxPwdAgeValue -eq "Unlimited") {
    $maxPwdAge = [int]::MaxValue
} else {
    $maxPwdAge = [int]$maxPwdAgeValue
}

# Create a custom object to store the results
$results = @()

foreach ($user in $users) {
    # Convert pwdLastSet to a readable date if it is greater than 0
    if ($user.pwdLastSet -gt 0) {
        $pwdLastSetDate = [datetime]::FromFileTimeUtc($user.pwdLastSet)
        $daysSincePwdLastSet = [math]::Round(((Get-Date) - $pwdLastSetDate).TotalDays)
        $daysUntilPwdExpiration = $maxPwdAge - $daysSincePwdLastSet
    } else {
        $pwdLastSetDate = $null
        $daysSincePwdLastSet = $null
        $daysUntilPwdExpiration = $null
    }
    $results += [PSCustomObject]@{
        UserName                  = $user.SamAccountName
        pwdLastSet                = $pwdLastSetDate
        DaysSincePwdLastSet       = $daysSincePwdLastSet
        DaysUntilPwdExpiration    = $daysUntilPwdExpiration
        Enabled                   = $user.Enabled
        LockedOut                 = $user.LockedOut
        PasswordExpired           = $user.PasswordExpired
        WhenCreated               = $user.WhenCreated
        LastSignIn                = $user.LastLogonDate
    }
}

# Filter out users with pwdLastSet set to null
$filteredResults = $results | Where-Object { $_.pwdLastSet -ne $null }

# Sort the results by pwdLastSet in descending order
$sortedResults = $filteredResults | Sort-Object -Property pwdLastSet -Descending

# Convert the results to HTML
$html = $sortedResults | ConvertTo-Html -Property UserName, pwdLastSet, DaysSincePwdLastSet, DaysUntilPwdExpiration, Enabled, LockedOut, PasswordExpired, WhenCreated, LastSignIn -Title "User Password Status" -PreContent "<h1>User Password Status</h1>"

# Add CSS for table styling
$style = @"
    <style>
        table {
            width: 100%;
            border-collapse: collapse;
        }
        table, th, td {
            border: 1px solid black;
        }
        th, td {
            padding: 1px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
    </style>
"@

$htmlContent = "$style$html"

# Save the HTML file
$htmlPath = "pwdLastSet.html"
$htmlContent | Out-File -FilePath $htmlPath

# Open the HTML file in the default browser
Start-Process "powershell.exe" -ArgumentList "Start-Process $htmlPath"
```