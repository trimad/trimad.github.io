---
author: Tristan Madden
categories: [powershell]
date: 2023-10-10
lastmod: 2024-09-20
featured: false
summary: "Install Windows Updates with the PSWindowsUpdate PowerShell module."
tags: [ai, images, video]
thumbnail: "thumbnail.png"
title: PSWindowsUpdate
toc: false
usePageBundles: true
---

Install Windows Updates with the PSWindowsUpdate PowerShell module.

```PowerShell
# Set the PowerShell script execution policy to 'RemoteSigned' for the current process.
# This allows locally-created scripts to run without requiring a digital signature, while scripts downloaded from the internet need to be signed by a trusted publisher.
Set-ExecutionPolicy RemoteSigned -Scope Process -Force
 
# Install the 'PSWindowsUpdate' module from the PowerShell Gallery.
# -Force: Forces the command to run without asking for user confirmation.
# -AllowClobber: Overwrites any existing cmdlets/functions with the same name.
Install-Module -Name PSWindowsUpdate -Force -AllowClobber
 
# Import the 'PSWindowsUpdate' module into the current PowerShell session to use its cmdlets.
Import-Module PSWindowsUpdate
 
# Retrieve and display a list of all available updates from Microsoft Update.
# -MicrosoftUpdate: Checks for updates from Microsoft Update, not just Windows Update.
Get-WindowsUpdate -MicrosoftUpdate
 
# Download all available updates from Microsoft Update.
# -AcceptAll: Automatically accepts all updates without prompting.
# -Verbose: Shows detailed information about the download process.
Download-WindowsUpdate -MicrosoftUpdate -AcceptAll -Verbose
 
# Install all downloaded updates from Microsoft Update and automatically reboot if necessary.
# -AcceptAll: Automatically accepts all updates without prompting.
# -AutoReboot: Allows the system to automatically reboot if it's required after installing updates.
Install-WindowsUpdate -MicrosoftUpdate -AcceptAll -AutoReboot
 
# Reset the PowerShell script execution policy to 'Restricted' for the current process.
# This does not load configuration files or run scripts and is the default setting.
Set-ExecutionPolicy Restricted -Scope Process -Force
```

{{% notice warning "WARNING" %}}
Don't forget to reset the PowerShell script execution policy back to 'Restricted' when you're done!
{{% /notice %}}