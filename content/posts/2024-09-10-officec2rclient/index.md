---
title: "Managing Microsoft Office Versions with OfficeC2RClient"
date: 2024-09-10
draft: false
tags: ["Microsoft Office", "OfficeC2RClient", "Version Management", "IT Admin"]
toc: true
thumbnail: "thumbnail.png"
---

Managing different versions of Microsoft 365 (M365) on Windows is crucial, especially when troubleshooting compatibility issues or performing tasks that require a specific version. This guide will walk you through checking your current M365 build, consulting the Office version history, and using `officec2rclient.exe` along with PowerShell commands to manage your Office versions efficiently.

## Checking Your Current M365 Build

Before making any changes, it's essential to know which version of Microsoft Office you currently have installed.

### Using an Office Application

1. Open any Office application (e.g., Word, Excel).
2. Click on **File** > **Account**.
3. Under **Product Information**, look for **About Word/Excel/etc.** to see the version and build number.

### Using PowerShell

You can also check the installed Office version using PowerShell:

```powershell
Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Office\ClickToRun\Configuration" | Select-Object -Property VersionToReport
```

Or from the command prompt:

```cmd
powershell.exe -Command "Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Office\ClickToRun\Configuration' | Select-Object -Property VersionToReport"
```

## Consulting the Office Version History

To decide which version you might want to roll back to or update, it's helpful to consult the official Office version history:

- Visit the Microsoft Office version history page to view a list of all released builds, along with their release dates and details.

## Rolling Back or Updating Microsoft Office Versions

Once you've identified the target version, you can use `officec2rclient.exe` to roll back or update your Office installation.

### Rolling Back to a Specific Version

#### Example: Rolling Back to Version 16.0.17830.20166

To roll back to version 16.0.17830.20166:

```cmd
cd "C:\Program Files\Common Files\Microsoft Shared\ClickToRun"
officec2rclient.exe /update user updatetoversion=16.0.17830.20166
```

#### Example: Rolling Back to Version 16.0.17726.20160

For version 16.0.17726.20160, run:

```cmd
cd "C:\Program Files\Common Files\Microsoft Shared\ClickToRun"
officec2rclient.exe /update user updatetoversion=16.0.17726.20160
```

**Important:** Before rolling back, disable automatic updates to prevent the system from upgrading after you've downgraded.

## Managing Automatic Updates

### Disabling Automatic Updates

#### Using Office Application Settings

1. Open any Office application.
2. Go to **File** > **Account**.
3. Click on **Update Options** and select **Disable Updates**.

#### Using PowerShell

To disable updates via PowerShell:

```powershell
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\office\16.0\common\officeupdate" -Name "enableautomaticupdates" -Value 0 -Type DWord
```

### Re-enabling Automatic Updates

#### Using Office Application Settings

1. Open any Office application.
2. Go to **File** > **Account**.
3. Click on **Update Options** and select **Enable Updates**.

#### Using PowerShell

```powershell
Remove-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\office\16.0\common\officeupdate" -Name "enableautomaticupdates"
```

## Managing the Click-to-Run Service

The Click-to-Run service handles Office installations and updates. You might need to manage this service when rolling back versions.

### Checking the Service Status

To check if the service is running:

```cmd
sc query ClickToRunSvc
```

### Stopping the Service

To stop the service:

```cmd
sc stop ClickToRunSvc
```

### Disabling the Service

To prevent the service from starting automatically:

```cmd
sc config ClickToRunSvc start= disabled
```

**Note:** Disabling this service stops future updates. Re-enable it when you're ready to update Office again.

### Re-enabling the Service

To re-enable and start the service:

```cmd
sc config ClickToRunSvc start= demand
sc start ClickToRunSvc
```

## Additional PowerShell Commands

### Forcing an Online Repair

If you're experiencing issues, performing an online repair can help:

```cmd
cd "C:\Program Files\Common Files\Microsoft Shared\ClickToRun"
officec2rclient.exe /repair user displaylevel=false
```

### Clearing the Update Cache

To clear the Office update cache:

```powershell
Remove-Item -Path "C:\ProgramData\Microsoft\ClickToRun\Download" -Recurse -Force
```

## Best Practices and Tips

- **Backup Settings:** Before making changes, back up your Office settings, especially if you have custom configurations or macros.
- **Monitor Updates:** Keep track of your Office versions and update history to manage installations effectively.
- **Stay Informed:** Regularly check the Office release notes for updates on new features and fixes.