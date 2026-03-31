---
author: "Tristan Madden"
categories:
  - "System Administration"
date: 2026-03-30
draft: false
summary: "Download KillRMM Build 128, a legacy batch file for removing the Datto RMM agent from a Windows endpoint."
tags:
  - "Datto"
  - "RMM"
  - "Windows"
  - "bat"
title: "KillRMM 128"
toc: false
usePageBundles: true
---

`KillRMM-128.bat` is a legacy batch file for removing the Datto RMM agent from a Windows endpoint. It stops the agent service, kills related processes, removes the install folder, clears CentraStage remnants, and can optionally uninstall Splashtop Streamer.

{{< notice type="warning" title="Warning" >}}
This is a destructive removal script, not a diagnostic tool. When run with administrative rights, it can remove the Datto RMM agent, delete its installation directory and related registry entries, remove CentraStage data, and optionally remove saved configuration data and Splashtop Streamer if you confirm those prompts. The prompts default to continuing when you press `Enter`, so use it only on systems you intentionally want to detach from Datto RMM.
{{< /notice >}}

## Download

{{< download-resource file="KillRMM-128.zip" title="Batch File" label="Download KillRMM-128.bat" >}}
The exact batch file is packaged as `KillRMM-128.zip` because the `.bat` file can trigger security filtering during transfer.
{{< /download-resource >}}

## Notes

- Run the file with `Run as administrator` or from an elevated Command Prompt.
- Do not try to launch it as a Datto RMM component; the script explicitly blocks that usage.
