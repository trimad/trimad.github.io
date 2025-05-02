---
author: Tristan Madden
categories: [python]
date: 2023-04-28
draft: true
featured: true
lastmod: 2023-04-28
summery: 
tags: [EXE,MSI]
toc: true
title: EXEtoMSI
thumbnail: "thumbnail.png"
usePageBundles: true
---

## Clone the Git Repository

<h3><a href="">GitHub Repository</a></h3>

```Shell
git clone dghdfjkghjk
```

_Change directorties to the repository you just cloned_

```Shell
cd C:\Users\User\Documents\GitHub\EXEtoMSI
```

## Environment Setup

_Create a Conda environment:_

WiX.py hasn't been updated in ages and doesn't work with Python 3.
```Shell
conda create --name EXEtoMSI python=2.7
```

_Import requirements_

```Shell
pip install -r requirements.txt
```

_List all installed packages to confirm WiX.py is installed successfully_

```Shell
conda list -n EXEtoMSI
```

## Prepare your template

1. Replace `PUT-GUID-HERE` with a GUID that's been randomly generated.

```PowerShell
powershell -Command "[guid]::NewGuid().ToString()"
```

2. Replace `YOUR_APP_NAME` with the name of your application, in this case `EXEtoMSI`.

3. Replace `PATH_TO_YOUR_EXE` with the absolute path of the installer.

4. Replace `YOUR_COMPANY_NAME` with the application's company name.

```XML
<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Product Id="*" Name="YOUR_APP_NAME" Language="1033" Version="1.0.0.0" Manufacturer="YOUR_COMPANY_NAME" UpgradeCode="PUT-GUID-HERE">
    <Package InstallerVersion="200" Compressed="yes" InstallScope="perMachine" />

    <MajorUpgrade DowngradeErrorMessage="A newer version of [ProductName] is already installed." />
    <MediaTemplate />

    <Feature Id="ProductFeature" Title="Main Feature" Level="1">
      <ComponentGroupRef Id="ProductComponents" />
    </Feature>

    <Directory Id="TARGETDIR" Name="SourceDir">
      <Directory Id="ProgramFilesFolder">
        <Directory Id="INSTALLFOLDER" Name="YOUR_APP_NAME">
          <Component Id="ApplicationFiles" Guid="PUT-GUID-HERE">
            <File Id="YOUR_APP_NAME" Source="PATH_TO_YOUR_EXE" KeyPath="yes" />
          </Component>
        </Directory>
      </Directory>
    </Directory>

    <ComponentGroup Id="ProductComponents" Directory="INSTALLFOLDER">
      <ComponentRef Id="ApplicationFiles" />
    </ComponentGroup>
  </Product>
</Wix>
``` 



## Run the Program

