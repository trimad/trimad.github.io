---
author: Tristan Madden
categories: [windows, troubleshooting]
date: 2025-12-03
draft: false
tags: [cmd, profiles, windows11, wmic]
title: "Rebuilding a Corrupted Windows User Profile Using CMD"
summary: "How to rebuild a corrupted Windows profile entirely through Command Prompt when remote tools won’t elevate."
usePageBundles: true
toc: false
---

When BOMGAR refuses to elevate and Take Control won’t cooperate, sometimes the fastest path forward is an old-school, command-line-based profile rebuild. In this case, the user’s profile on a Windows 11 workstation had become corrupted, preventing normal login and blocking GUI-level repair steps. Here’s how I rebuilt the profile entirely through **Command Prompt (Admin)**.

## 1. Get the user’s SID
Windows ties each profile to a unique SID under the `ProfileList` hive. First, query the SID for the affected user:

```cmd
wmic useraccount where name="username" get sid
```

This returns a value similar to:

```cmd
S-1-5-21-140118302-1422541528-1232828436-72774
```

You’ll need this SID for the registry cleanup step.

## 2. Rename the existing profile folder
Navigate to `C:\Users` and rename the user’s profile directory so Windows provisions a fresh one on next login:

```cmd
ren username username.old
```

This preserves the user’s data while detaching it from the corrupted profile.

## 3. Delete the profile’s registry key
Removing the SID entry forces Windows to recreate the profile:

```cmd
reg delete "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\ProfileList\S-1-5-21-140118302-1426151528-1232828436-72774" /f
```

Without this step, Windows will continue attempting to load the corrupted profile.

## 4. Copy user data back
After the user logs in and the new profile folder is created, copy their files back:

```cmd
xcopy "C:\Users\username.old" "C:\Users\username" /E /H /K
```

Avoid copying low-level profile state files such as `NTUSER.DAT` or `%appdata%` caches, as these can reintroduce corruption.

## 5. Result
After completing these steps, the user was able to log in successfully, and application behavior returned to normal without requiring elevated remote sessions.
