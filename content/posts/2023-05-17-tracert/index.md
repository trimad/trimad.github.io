---
author: Tristan Madden
categories: [Shell]
date: 2023-05-17
draft: true
tags: [tracert, networking, powershell]
title: "Tracert"
summary: "A PowerShell script to run tracert for multiple computers listed in a text file"
usePageBundles: true
toc: true
---

## tracert for all computers in a text file

```PowerShell
# Get the list of computers
$computers = Get-Content -Path .\computers.txt

# Loop over each computer
foreach ($computer in $computers) {
    # Print the computer name to the console and to the output file
    Write-Output "Tracing route to $computer"
    "Tracing route to $computer" | Out-File -Append -Encoding utf8 -FilePath .\output.txt

    # Run tracert and save the output to the output file
    tracert $computer | Out-File -Append -Encoding utf8 -FilePath .\output.txt
}

```
