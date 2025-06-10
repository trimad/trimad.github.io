---
title: "Troubleshoot Crashing Apps with ProcDump & WinDbg"
date: 2025-05-01
tags: ["windows", "troubleshooting", "procdump", "windbg", "sysinternals"]
description: "Step‑by‑step guide for capturing crash dumps with ProcDump and performing post‑mortem analysis in WinDbg."
toc: true
usePageBundles: false
---

> _“Logs tell you something broke; a crash dump tells you **why**.”_

---

## 1. Set the Stage

1. **Grab ProcDump** if it’s not already on your toolbox machine.  
   👉 [ProcDump — Sysinternals](https://learn.microsoft.com/sysinternals/downloads/procdump)

2. **Create a home for dumps**:

   ```powershell
   New-Item -ItemType Directory C:\Dumps -Force
   ```

3. **Clean the slate:** Close every stray instance of the app you’re chasing.

---

## 2. Capture the Crash

```cmd
procdump.exe -e -h -ma excel.exe C:\Dumps
```

| Switch | Why it matters |
| ------ | --------------- |
| `-e`   | Breaks on an unhandled **e**xception (a real crash, not a polite exit) |
| `-h`   | Also triggers on a user‑mode **h**ang (useful when the UI just freezes) |
| `-ma`  | Creates a **m**ini‑dump **a**nd _all_ process memory (full dump) |

ProcDump parks the dump as `excel.exe_YYMMDD_HHMM.dmp` in `C:\Dumps`. Reproduce the crash and wait for _Dump written_ to show.

---

## 3. Install WinDbg

I use **WinDbg Preview** because dark mode is life:  
👉 [Install WinDbg — Windows Drivers](https://learn.microsoft.com/windows-hardware/drivers/debugger/debugger-download-tools)

---

## 4. Open the Dump

1. **File → Open Dump…**  
2. The debugger breaks immediately—no need to hit _Start_.  
3. Paste your symbol path (one‑liner, no spaces):

   ```cmd
   .symfix; .reload
   ```

   > For stubborn cases:  
   > `setx _NT_SYMBOL_PATH "srv*C:\Symbols*https://msdl.microsoft.com/download/symbols"` and relaunch WinDbg.

---

## 5. Auto‑analysis

```cmd
!analyze -v
```

- **`EXCEPTION_CODE`** tells you _what_ blew up.  
- **Faulting module** shows _where_ (DLL or EXE).  
- The **stack trace** is your breadcrumb trail.

If the stack ends in `ucrtbase!_invalid_parameter`, your app fed bad data to a C runtime call—it’s not always Microsoft’s fault, promise.

---

## 6. Dig Deeper

- **Threads:** `~* k` to list every thread’s call stack.  
- **Loaded modules:** `lmvm excel` (swap `excel` for any DLL).  
- **Memory leaks:** `!heap -s` (when RAM keeps climbing pre‑crash).  
- **Handle leaks:** `!handle 0 7` (careful, noisy).

---

## 7. Fix or Escalate

1. **Patch or update** the crashing module first.  
2. **Check add‑ins & plugins**—Office add‑ins love to throw stones.  
3. **Validate input** if you own the source.  
4. **Capture a second dump** after changes; compare stacks.

---

## Cheat Sheet

```text
.sympath           # Show current symbol path
.reload /f         # Force symbol reload
.ecxr              # Switch to the crashing thread’s context
kb / kH            # Short / long stack
u address          # Disassemble around address
.dt nt!_EXCEPTION_RECORD -r @$exr  # Decode exception record
```