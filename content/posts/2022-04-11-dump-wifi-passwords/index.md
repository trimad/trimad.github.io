---
title: Dump WiFi Passwords
author: Tristan Madden
categories: [PowerShell]
tags: [netsh, passwords, reports]
date: 2022-04-11
thumbnail: "thumbnail.png"
usePageBundles: true
---

This script uses the Windows command-line tool "netsh" to retrieve information about wireless network profiles that have been previously connected to on the computer. It then parses the information to extract the SSID (name) and password for each profile, and outputs that information to a CSV file named "output.csv". Finally, the script opens the "output.csv" file.

The script uses the "Invoke-Item" command to open the "output.csv" file, which is the PowerShell command equivalent of double-clicking on a file in Windows Explorer. It opens the file in the default application associated with the .csv file type on the system, typically it will be opened in excel or similar spreadsheet software.

```powershell
$cmd= @(netsh wlan show profile)
$profiles = @()
foreach ($line in $cmd)
{
$skip = 27
if($line -Match "All User Profile")
    {
$line = $line.SubString($skip, $line.Length-$skip)
  $profiles += $line
    }
}
$output = foreach ($profile in $profiles)
{
$skip = 29
  $info = @(netsh wlan show profile $profile key=clear)
  foreach ($line in $info)
  {
  if($line -Match "Key Content")
    {
        New-Object -TypeName PSObject -Property @{
            SSID = $profile
            Password = $line.SubString($skip, $line.Length-$skip)
        }
    }
  }
}
$output | Export-Csv output.csv -NoTypeInformation
Invoke-Item "output.csv"
```