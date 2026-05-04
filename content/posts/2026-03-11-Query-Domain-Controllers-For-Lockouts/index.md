---
ai: true
ai-tested-date: 2026-03-11
author: "Tristan Madden"
categories:
  - "PowerShell"
date: 2026-03-11
draft: false
summary: "Query multiple domain controllers for lockouts and failed logons in PowerShell 5.1, then troubleshoot repeated account lockouts using cached credentials, mapped drives, and Kerberos tickets."
tags:
  - "powershell"
  - "active-directory"
  - "domain-controllers"
  - "security-events"
  - "account-lockout"
title: "Query Domain Controllers For Lockouts And Failed Logons In PowerShell 5.1"
toc: true
usePageBundles: true
---

## Overview

If you are trying to track down account lockouts or repeated failed logons in an older Windows PowerShell 5.1 environment, a script that looks perfectly reasonable on paper can still come back empty. That usually happens because the collection method is the real problem, not the event filter.

In this post, I walk through a PowerShell 5.1-friendly approach for collecting Security log events from multiple domain controllers, explain why the original `Invoke-Command` fan-out can be unreliable in some environments, and provide a parallel job-based version that keeps multithreading without depending on a single brittle remoting pattern.

I also included a troubleshooting section for repeated lockouts caused by stale cached credentials, lingering mapped drives, and old Kerberos tickets.

## Requirements

- Windows PowerShell 5.1
- Active Directory PowerShell module
- Permission to query Security logs on your domain controllers
- Network access to the DCs you want to query

## Key Capabilities

- Queries multiple domain controllers for Security events 4740, 4625, and 4771
- Uses background jobs for parallel collection in PowerShell 5.1
- Captures per-DC failures instead of silently returning an empty result set
- Exports both CLIXML and CSV output for review and reuse
- Includes repeat-lockout troubleshooting steps for cached credentials and Kerberos

## The Script

```powershell
$StartTime = (Get-Date).AddHours(-12)
$EventIDs  = 4740,4625,4771
$OutputDir = 'C:\Temp'

if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$XmlOutput = Join-Path $OutputDir 'ADAuthEvents.xml'
$CsvOutput = Join-Path $OutputDir 'ADAuthEvents.csv'
$ErrOutput = Join-Path $OutputDir 'ADAuthEvents_Errors.txt'

if (Test-Path $ErrOutput) {
    Remove-Item $ErrOutput -Force
}

try {
    $dcs = Get-ADDomainController -Filter * | Select-Object -ExpandProperty HostName
}
catch {
    Write-Error "Failed to enumerate domain controllers. $_"
    return
}

if (-not $dcs) {
    Write-Warning "No domain controllers were returned by Get-ADDomainController."
    return
}

Write-Host "Launching jobs for $($dcs.Count) domain controllers..." -ForegroundColor Cyan

$jobs = foreach ($dc in $dcs) {
    Start-Job -Name $dc -ArgumentList $dc,$StartTime,$EventIDs -ScriptBlock {
        param($dc,$StartTime,$EventIDs)

        try {
            Get-WinEvent -ComputerName $dc -FilterHashtable @{
                LogName   = 'Security'
                Id        = $EventIDs
                StartTime = $StartTime
            } -ErrorAction Stop | ForEach-Object {

                $xml = [xml]$_.ToXml()
                $data = @{}

                foreach ($d in $xml.Event.EventData.Data) {
                    if ($null -ne $d.Name -and $d.Name -ne '') {
                        $data[$d.Name] = $d.'#text'
                    }
                }

                [PSCustomObject]@{
                    Time             = $_.TimeCreated
                    DomainController = $dc
                    MachineName      = $_.MachineName
                    EventID          = $_.Id
                    TargetUser       = $data['TargetUserName']
                    CallerComputer   = $data['CallerComputerName']
                    Workstation      = $data['WorkstationName']
                    SourceIP         = $data['IpAddress']
                    LogonType        = $data['LogonType']
                    Status           = $data['Status']
                    SubStatus        = $data['SubStatus']
                    FailureCode      = $data['FailureCode']
                    Message          = $_.Message
                }
            }
        }
        catch {
            [PSCustomObject]@{
                Time             = Get-Date
                DomainController = $dc
                MachineName      = $dc
                EventID          = 'ERROR'
                TargetUser       = $null
                CallerComputer   = $null
                Workstation      = $null
                SourceIP         = $null
                LogonType        = $null
                Status           = $null
                SubStatus        = $null
                FailureCode      = $null
                Message          = $_.Exception.Message
            }
        }
    }
}

if ($jobs) {
    Wait-Job -Job $jobs | Out-Null
}

$rawResults = if ($jobs) {
    Receive-Job -Job $jobs
}

if ($jobs) {
    $jobs | Remove-Job -Force
}

$errors  = $rawResults | Where-Object { $_.EventID -eq 'ERROR' }
$results = $rawResults | Where-Object { $_.EventID -ne 'ERROR' } | Sort-Object Time -Descending

if ($errors) {
    $errors | ForEach-Object {
        "[{0}] {1} - {2}" -f $_.Time, $_.DomainController, $_.Message
    } | Set-Content -Path $ErrOutput
}

if ($results) {
    $results | Export-Clixml -Path $XmlOutput
    $results | Export-Csv -Path $CsvOutput -NoTypeInformation -Encoding UTF8

    Write-Host "Results saved to:" -ForegroundColor Green
    Write-Host "  $XmlOutput" -ForegroundColor Green
    Write-Host "  $CsvOutput" -ForegroundColor Green

    if ($errors) {
        Write-Host "Some DCs failed. See: $ErrOutput" -ForegroundColor Yellow
    }

    $results
}
else {
    Write-Warning "No matching events were returned."

    if ($errors) {
        Write-Host "Error details:" -ForegroundColor Yellow
        Get-Content $ErrOutput
    }
}
```

## How to Use

1. Save the script to a `.ps1` file on a system that has the AD module available.
2. Run it in Windows PowerShell 5.1 with an account that can read Security logs on the domain controllers.
3. Review the live output, then check `C:\Temp\ADAuthEvents.csv` and `C:\Temp\ADAuthEvents.xml`.
4. If one or more domain controllers fail, review `C:\Temp\ADAuthEvents_Errors.txt`.
5. Narrow the time range, usernames, or source systems if you need a more targeted search.

## Example Output

```text
Time                 : 3/11/2026 10:42:18 AM
DomainController     : DC01.contoso.local
MachineName          : DC01.contoso.local
EventID              : 4740
TargetUser           : jdoe
CallerComputer       : WS-4421
Workstation          :
SourceIP             :
LogonType            :
Status               :
SubStatus            :
FailureCode          :
Message              : A user account was locked out.

Time                 : 3/11/2026 10:41:03 AM
DomainController     : DC02.contoso.local
MachineName          : DC02.contoso.local
EventID              : 4625
TargetUser           : jdoe
CallerComputer       :
Workstation          : WS-4421
SourceIP             : 10.20.30.44
LogonType            : 3
Status               : 0xC000006D
SubStatus            : 0xC000006A
FailureCode          :
Message              : An account failed to log on.
```

## Troubleshooting Repeated Lockouts

If the script shows the same user being locked out over and over, the actual root cause is often not the domain controller. In many cases, it is a workstation, server, mapped drive, scheduled task, or cached credential still trying to authenticate with an old password.

### Check cached credentials

Run this from the affected system:

```cmd
cmdkey /list
```

This shows stored credentials in Windows Credential Manager. Look for:

- old server names
- file shares
- RDP targets
- stale usernames
- anything using the affected account

If you find stale credentials, remove them from Credential Manager or with `cmdkey /delete`.

### Check mapped drives and persistent connections

Run:

```cmd
net use
```

This shows active and persistent network connections. A disconnected or hidden reconnecting share can keep retrying old credentials in the background. Pay attention to:

- persistent mappings to file servers
- old admin shares
- drives reconnecting at sign-in
- connections using the affected account

If needed, remove stale mappings, for example:

```cmd
net use * /delete /y
```

Use caution with that command, because it disconnects all mapped drives for the current session.

### Check Kerberos tickets

Run:

```cmd
klist
```

This displays the Kerberos tickets cached for the current logon session. This can help you confirm whether the user is still holding old service tickets or stale authentication context while troubleshooting repeated failures.

Things to review include:

- service tickets for file servers or application servers
- unusually old tickets
- tickets tied to systems the user should no longer be contacting
- repeated access attempts to the same service

### Purge Kerberos tickets

To clear cached Kerberos tickets for the current session, run:

```cmd
klist purge
```

You will usually need to close and reopen applications, reconnect to file shares, and in some cases sign out and back in again. Purging tickets can be useful after a password change or while testing whether stale Kerberos state is contributing to repeated lockouts.

### Typical lockout culprits to investigate

If the lockouts continue, also check:

- scheduled tasks running under the affected account
- Windows services using the old password
- mobile mail clients
- saved credentials in Outlook or Office apps
- disconnected RDP sessions
- line-of-business apps with embedded credentials
- scripts running from login tasks or server-side automation

## Why the Original Script Failed

The original script used `Invoke-Command -ComputerName $dcs` to fan out across all domain controllers at once. That can work, but it is also more fragile than it looks in older environments. Even if `Test-WsMan` succeeds against one domain controller, that does not guarantee that:

- WinRM is enabled and accessible on every DC
- your account can execute the remote script block everywhere
- each remote session can read the Security log
- remoting failures will be obvious if errors are being suppressed

The other problem was `-ErrorAction SilentlyContinue` on `Get-WinEvent`, which can hide the exact failure you need to see.

## Why This Version Is Better

The version in this post keeps parallelism, but does it with one background job per domain controller instead of depending on a single fan-out remoting call. That gives you a few advantages:

- better visibility into which DC failed
- more reliable collection in mixed or restrictive environments
- easier troubleshooting when only some DCs respond
- output that still works even if a subset of DCs fail

## Final Thoughts

When you are tracking down account lockouts, the event collection script is only half the job. The other half is identifying what system is still trying to use bad credentials. Once you have the DC-side evidence, combine it with checks for cached credentials, mapped drives, Kerberos tickets, services, and scheduled tasks on the source machine.

That combination usually gets you to the real cause much faster than staring at Security events alone.
