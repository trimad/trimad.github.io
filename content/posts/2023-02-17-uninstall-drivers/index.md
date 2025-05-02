---
author: Tristan Madden
categories: [Shell]
date: 2023-02-06
lastmod: 2023-02-17
tags: [drivers]
title: Uninstall Third-Party Drivers with CMD
usePageBundles: true
thumbnail: "thumbnail.png"
---

You can uninstall third-party drivers (such as the WAVES MaxxAudio Pro driver) from the Command Prompt (CMD) by using the "pnputil.exe" utility. Here's the basic process:

Open Command Prompt as administrator: Press the Windows key + X, and then select "Command Prompt (Admin)".

Type the following command and press Enter:

```Shell
pnputil.exe -e
# or export the list to a file
pnputil.exe -e > !drivers.csv
```

This command lists all the third-party drivers installed on your system.

Locate the driver in the list and make note of its INF file name (e.g. oemXXX.inf).

Type the following command and press Enter, replacing "INF_file_name" with the actual INF file name you noted in step 3:

```Shell
pnputil.exe -d INF_file_name
# e.g. pnputil.exe -d oem72.inf
```

This command uninstalls the driver.

Restart your computer to complete the uninstallation process.