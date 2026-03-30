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

`KillRMM-128.bat` is a legacy batch file for removing the Datto RMM agent from a Windows endpoint. It stops the agent service, kills related processes, removes the install folder, clears CentraStage remnants, and can optionally uninstall Splashtop Streamer if it is present.

Run it locally on the target machine with administrative rights. The script is interactive, so it prompts before uninstalling the agent, before removing saved configuration data, and before removing Splashtop.

## Download

{{< download-resource file="KillRMM-128.bat" title="Batch File" label="Download KillRMM-128.bat" >}}
This page bundles the exact `.bat` file described here, so the download button points directly to the page resource.
{{< /download-resource >}}

## Notes

- Run the file with `Run as administrator` or from an elevated Command Prompt.
- Do not try to launch it as a Datto RMM component; the script explicitly blocks that usage.
- Review each prompt before removing user configuration data or uninstalling Splashtop Streamer.
