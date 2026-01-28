---
author: "Tristan Madden"
categories:
  - PowerShell
date: 2026-01-27
description: "A PowerShell script that collects DNS records relevant to email delivery and security, including MX, SPF, DMARC, and related lookups."
draft: false
tags:
  - dns
  - dmarc
  - email
  - mx
  - nslookup
  - powershell
  - spf
title: "Get DNS Records with PowerShell"
toc: true
---

# The Script
{{< notice type="warning" title="AI-Generated Content" >}}
This PowerShell script and description are AI-generated. Please review for completeness and accuracy.
{{< /notice >}}


This PowerShell script builds a DNS “inventory” report for a given domain by querying common records (A/AAAA/NS/SOA/MX/TXT/CNAME/CAA), email-security records (DMARC, SPF, DKIM across many selectors, BIMI, MTA-STS, TLS-RPT), common hostnames (autodiscover/mail/smtp/etc.), and related SRV records. It safely wraps Resolve-DnsName to normalize results (ok/missing/error/unsupported), flattens TXT values to extract things like the SPF/DMARC strings, and recursively expands SPF include:/redirect= chains up to a max depth while avoiding loops. If CAA lookups aren’t supported by the local Resolve-DnsName, it falls back to nslookup -type=caa, and it also resolves MX/apex IPs and performs PTR lookups for those IPs. Finally, it writes everything as JSON to C:\Temp\<domain>.json and prints the saved path.

```powershell
$Domain = "domain.com"

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# -------------------- StrictMode-safe helpers --------------------

function Has-Prop {
  param(
    [Parameter(Mandatory)] $Obj,
    [Parameter(Mandatory)] [string] $Name
  )
  return ($null -ne $Obj) -and ($null -ne $Obj.PSObject) -and ($null -ne $Obj.PSObject.Properties[$Name])
}

function Get-Prop {
  param(
    [Parameter(Mandatory)] $Obj,
    [Parameter(Mandatory)] [string] $Name
  )
  if (Has-Prop -Obj $Obj -Name $Name) { return $Obj.$Name }
  return $null
}

function New-ResultObject {
  param([string]$Name, [string]$Type)
  [pscustomobject]@{
    name        = $Name
    type        = $Type
    status      = "unknown"   # ok | missing | error | unsupported
    answers     = @()
    notes       = @()
    error       = $null
    queried_at  = (Get-Date).ToString("o")
  }
}

function Resolve-DnsSafe {
  param(
    [Parameter(Mandatory)] [string]$Name,
    [Parameter(Mandatory)] [string]$Type
  )

  $res = New-ResultObject -Name $Name -Type $Type

  try {
    $r = Resolve-DnsName -Name $Name -Type $Type -DnsOnly -ErrorAction Stop

    $ans = @($r | Where-Object { (Has-Prop $_ "Section") -and $_.Section -eq "Answer" })
    if ($ans.Count -gt 0) {
      $res.status = "ok"
      $res.answers = $ans
    } else {
      $res.status = "missing"
      $res.notes += "No Answer section records; record likely does not exist (Authority section may contain SOA)."
    }
  }
  catch {
    $msg = $_.Exception.Message
    if ($msg -match "DNS name does not exist") {
      $res.status = "missing"
      $res.notes += "NXDOMAIN (DNS name does not exist)."
    }
    elseif ($msg -match "Unable to match the identifier name CAA") {
      $res.status = "unsupported"
      $res.notes += "CAA not supported by this Resolve-DnsName build; will attempt nslookup fallback."
    }
    else {
      $res.status = "error"
      $res.error  = $msg
    }
  }

  return $res
}

function Extract-TxtStrings {
  param($ResolveResult)

  $vals = New-Object System.Collections.Generic.List[string]
  foreach ($a in @($ResolveResult.answers)) {
    if (Has-Prop $a "Strings") {
      $s = $a.Strings
      if ($null -ne $s) { $vals.Add(($s -join "")) }
    }
    elseif (Has-Prop $a "Text") {
      $t = $a.Text
      if ($null -ne $t) { $vals.Add(($t -join "")) }
    }
  }
  return $vals.ToArray()
}

function Nslookup-CAA {
  param([Parameter(Mandatory)][string]$Name)

  # Native PowerShell-only suppression of nslookup "stderr -> NativeCommandError"
  # We temporarily suppress error display and capture both streams as text.
  $oldEap = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  try {
    $raw = & nslookup.exe -type=caa $Name 2>&1
  }
  finally {
    $ErrorActionPreference = $oldEap
  }

  $lines = @($raw) | ForEach-Object { $_.ToString().Trim() } | Where-Object {
    $_ -and
    $_ -notmatch "^\*{3}" -and
    $_ -notmatch "^Server:" -and
    $_ -notmatch "^Address:" -and
    $_ -notmatch "^Non-authoritative answer" -and
    $_ -notmatch "Can't find server address" -and
    $_ -notmatch "DNS request timed out"
  }

  # nslookup formatting varies; keep likely CAA lines
  $caaLines = @($lines | Where-Object { $_ -match "\b(issue|issuewild|iodef)\b" -or $_ -match "\bCAA\b" -or $_ -match "\bcaa\b" })

  [pscustomobject]@{
    name   = $Name
    type   = "CAA"
    status = if ($caaLines.Count -gt 0) { "ok" } else { "missing" }
    raw    = $lines
    caa    = $caaLines
    notes  = @("nslookup output captured with local ErrorActionPreference=SilentlyContinue to avoid NativeCommandError noise.")
  }
}

function Get-PtrForIp {
  param([Parameter(Mandatory)][string]$Ip)
  return (Resolve-DnsSafe -Name $Ip -Type "PTR")
}

function Get-SpfTree {
  param(
    [Parameter(Mandatory)][string]$Name,
    [int]$Depth = 0,
    [int]$MaxDepth = 8,
    [hashtable]$Seen = $null
  )
  if (-not $Seen) { $Seen = @{} }

  $node = [pscustomobject]@{
    domain      = $Name
    depth       = $Depth
    record      = $null
    mechanisms  = @()
    includes    = @()
    status      = "unknown"
    notes       = @()
  }

  if ($Seen.ContainsKey($Name)) {
    $node.status = "ok"
    $node.notes += "Already visited (cycle prevention)."
    return $node
  }
  $Seen[$Name] = $true

  $txt = Resolve-DnsSafe -Name $Name -Type "TXT"
  if ($txt.status -ne "ok") {
    $node.status = $txt.status
    $node.notes += "TXT lookup status: $($txt.status)"
    if ($txt.error) { $node.notes += $txt.error }
    return $node
  }

  $spf = (Extract-TxtStrings $txt) | Where-Object { $_ -match '^v=spf1\b' } | Select-Object -First 1
  if (-not $spf) {
    $node.status = "missing"
    $node.notes += "No v=spf1 TXT record found."
    return $node
  }

  $node.status = "ok"
  $node.record = $spf

  $parts = @($spf -split "\s+") | Where-Object { $_ }
  foreach ($p in $parts) {
    $node.mechanisms += $p

    if ($p -like "include:*") {
      $inc = $p.Substring("include:".Length)
      if ($Depth -lt $MaxDepth) {
        $node.includes += (Get-SpfTree -Name $inc -Depth ($Depth+1) -MaxDepth $MaxDepth -Seen $Seen)
      } else {
        $node.notes += "MaxDepth reached; include not expanded: $inc"
      }
    }
    elseif ($p -like "redirect=*") {
      $redir = $p.Substring("redirect=".Length)
      if ($Depth -lt $MaxDepth) {
        $node.includes += (Get-SpfTree -Name $redir -Depth ($Depth+1) -MaxDepth $MaxDepth -Seen $Seen)
      } else {
        $node.notes += "MaxDepth reached; redirect not expanded: $redir"
      }
    }
  }

  return $node
}

# -------------------- configuration --------------------

$SpfMaxDepth = 10
$DkimSelectors = @(
  "selector1","selector2","default","google","s1","s2","dkim","mail","mta","k1","k2",
  "smtp","sendgrid","mailgun","mandrill","amazonses","ses","sparkpost","postmark","zoho",
  "mimecast","proofpoint","pp","mg","k3","k4"
)

# -------------------- build report --------------------

$Domain = $Domain.ToLower()

$report = [ordered]@{
  meta = [ordered]@{
    domain       = $Domain
    generated_at = (Get-Date).ToString("o")
    host         = $env:COMPUTERNAME
    user         = $env:USERNAME
    powershell   = $PSVersionTable.PSVersion.ToString()
    strictmode   = "Latest"
  }

  apex = [ordered]@{
    A     = Resolve-DnsSafe -Name $Domain -Type "A"
    AAAA  = Resolve-DnsSafe -Name $Domain -Type "AAAA"
    NS    = Resolve-DnsSafe -Name $Domain -Type "NS"
    SOA   = Resolve-DnsSafe -Name $Domain -Type "SOA"
    MX    = Resolve-DnsSafe -Name $Domain -Type "MX"
    TXT   = Resolve-DnsSafe -Name $Domain -Type "TXT"
    CNAME = Resolve-DnsSafe -Name $Domain -Type "CNAME"
    CAA   = Resolve-DnsSafe -Name $Domain -Type "CAA"
  }

  mail_security = [ordered]@{
    dmarc = Resolve-DnsSafe -Name ("_dmarc.$Domain") -Type "TXT"
    bimi  = Resolve-DnsSafe -Name ("default._bimi.$Domain") -Type "TXT"
    mta_sts_policy = Resolve-DnsSafe -Name ("_mta-sts.$Domain") -Type "TXT"
    tls_rpt = Resolve-DnsSafe -Name ("_smtp._tls.$Domain") -Type "TXT"
    spf_tree = $null
    dkim = [ordered]@{
      selectors_tried   = $DkimSelectors
      selector_results  = @()
    }
  }

  common_hostnames = [ordered]@{
    autodiscover = [ordered]@{
      A     = Resolve-DnsSafe -Name ("autodiscover.$Domain") -Type "A"
      AAAA  = Resolve-DnsSafe -Name ("autodiscover.$Domain") -Type "AAAA"
      CNAME = Resolve-DnsSafe -Name ("autodiscover.$Domain") -Type "CNAME"
    }
    mta_sts_host = [ordered]@{
      A     = Resolve-DnsSafe -Name ("mta-sts.$Domain") -Type "A"
      AAAA  = Resolve-DnsSafe -Name ("mta-sts.$Domain") -Type "AAAA"
      CNAME = Resolve-DnsSafe -Name ("mta-sts.$Domain") -Type "CNAME"
    }
    mail = [ordered]@{
      A     = Resolve-DnsSafe -Name ("mail.$Domain") -Type "A"
      AAAA  = Resolve-DnsSafe -Name ("mail.$Domain") -Type "AAAA"
      CNAME = Resolve-DnsSafe -Name ("mail.$Domain") -Type "CNAME"
    }
    smtp = [ordered]@{
      A     = Resolve-DnsSafe -Name ("smtp.$Domain") -Type "A"
      AAAA  = Resolve-DnsSafe -Name ("smtp.$Domain") -Type "AAAA"
      CNAME = Resolve-DnsSafe -Name ("smtp.$Domain") -Type "CNAME"
    }
    imap = [ordered]@{
      A     = Resolve-DnsSafe -Name ("imap.$Domain") -Type "A"
      AAAA  = Resolve-DnsSafe -Name ("imap.$Domain") -Type "AAAA"
      CNAME = Resolve-DnsSafe -Name ("imap.$Domain") -Type "CNAME"
    }
    pop = [ordered]@{
      A     = Resolve-DnsSafe -Name ("pop.$Domain") -Type "A"
      AAAA  = Resolve-DnsSafe -Name ("pop.$Domain") -Type "AAAA"
      CNAME = Resolve-DnsSafe -Name ("pop.$Domain") -Type "CNAME"
    }
    webmail = [ordered]@{
      A     = Resolve-DnsSafe -Name ("webmail.$Domain") -Type "A"
      AAAA  = Resolve-DnsSafe -Name ("webmail.$Domain") -Type "AAAA"
      CNAME = Resolve-DnsSafe -Name ("webmail.$Domain") -Type "CNAME"
    }
  }

  srv = [ordered]@{
    submission = Resolve-DnsSafe -Name ("_submission._tcp.$Domain") -Type "SRV"
    smtp       = Resolve-DnsSafe -Name ("_smtp._tcp.$Domain") -Type "SRV"
    imap       = Resolve-DnsSafe -Name ("_imap._tcp.$Domain") -Type "SRV"
    pop3       = Resolve-DnsSafe -Name ("_pop3._tcp.$Domain") -Type "SRV"
    autodiscover = Resolve-DnsSafe -Name ("_autodiscover._tcp.$Domain") -Type "SRV"
    sip_tls            = Resolve-DnsSafe -Name ("_sip._tls.$Domain") -Type "SRV"
    sipfederationtls   = Resolve-DnsSafe -Name ("_sipfederationtls._tcp.$Domain") -Type "SRV"
  }

  derived = [ordered]@{
    txt_all_values = @()
    spf_record     = $null
    dmarc_record   = $null
    bimi_record    = $null
    mta_sts_record = $null
    tls_rpt_record = $null

    mx_hosts       = @()
    mx_host_ips    = @()
    apex_ips       = @()
    ptr_lookups    = @()
    caa_nslookup   = $null
  }
}

# TXT flattening
if ($report.apex.TXT.status -eq "ok") {
  $report.derived.txt_all_values = @(Extract-TxtStrings $report.apex.TXT)
  $report.derived.spf_record = ($report.derived.txt_all_values | Where-Object { $_ -match '^v=spf1\b' } | Select-Object -First 1)
}

if ($report.mail_security.dmarc.status -eq "ok") {
  $report.derived.dmarc_record = (Extract-TxtStrings $report.mail_security.dmarc | Select-Object -First 1)
}
if ($report.mail_security.bimi.status -eq "ok") {
  $report.derived.bimi_record = (Extract-TxtStrings $report.mail_security.bimi | Select-Object -First 1)
}
if ($report.mail_security.mta_sts_policy.status -eq "ok") {
  $report.derived.mta_sts_record = (Extract-TxtStrings $report.mail_security.mta_sts_policy | Select-Object -First 1)
}
if ($report.mail_security.tls_rpt.status -eq "ok") {
  $report.derived.tls_rpt_record = (Extract-TxtStrings $report.mail_security.tls_rpt | Select-Object -First 1)
}

# SPF tree
$report.mail_security.spf_tree = Get-SpfTree -Name $Domain -MaxDepth $SpfMaxDepth

# DKIM selectors
foreach ($sel in $DkimSelectors) {
  $q = "$sel._domainkey.$Domain"

  $item = [ordered]@{
    selector = $sel
    name     = $q
    txt      = Resolve-DnsSafe -Name $q -Type "TXT"
    cname    = Resolve-DnsSafe -Name $q -Type "CNAME"
    cname_target_txt = $null
    derived = [ordered]@{
      dkim_txt_values = @()
      cname_target    = $null
    }
  }

  if ($item.txt.status -eq "ok") {
    $item.derived.dkim_txt_values = @(Extract-TxtStrings $item.txt)
  }

  if ($item.cname.status -eq "ok" -and $item.cname.answers.Count -gt 0) {
    $first = $item.cname.answers[0]
    $target = $null
    if (Has-Prop $first "NameHost")       { $target = $first.NameHost }
    elseif (Has-Prop $first "NameTarget") { $target = $first.NameTarget }

    $item.derived.cname_target = $target
    if ($target) { $item.cname_target_txt = Resolve-DnsSafe -Name $target -Type "TXT" }
  }

  $report.mail_security.dkim.selector_results += [pscustomobject]$item
}

# MX host resolution + PTR
if ($report.apex.MX.status -eq "ok") {
  $mxHosts = @()
  foreach ($mxAns in @($report.apex.MX.answers)) {
    $ex = Get-Prop $mxAns "NameExchange"
    if ($ex) { $mxHosts += $ex }
  }
  $mxHosts = $mxHosts | Select-Object -Unique
  $report.derived.mx_hosts = @($mxHosts)

  foreach ($mx in $mxHosts) {
    $a    = Resolve-DnsSafe -Name $mx -Type "A"
    $aaaa = Resolve-DnsSafe -Name $mx -Type "AAAA"

    $ips = @()
    if ($a.status -eq "ok") {
      foreach ($ans in @($a.answers)) {
        $ip = Get-Prop $ans "IPAddress"
        if ($ip) { $ips += $ip }
      }
    }
    if ($aaaa.status -eq "ok") {
      foreach ($ans in @($aaaa.answers)) {
        $ip = Get-Prop $ans "IPAddress"
        if ($ip) { $ips += $ip }
      }
    }

    $ips = $ips | Where-Object { $_ } | Select-Object -Unique

    $report.derived.mx_host_ips += [pscustomobject]@{
      host = $mx
      A    = $a
      AAAA = $aaaa
      ips  = @($ips)
    }

    foreach ($ip in $ips) {
      $report.derived.ptr_lookups += (Get-PtrForIp -Ip $ip)
    }
  }
}

# Apex PTRs
$apexIps = @()
if ($report.apex.A.status -eq "ok") {
  foreach ($ans in @($report.apex.A.answers)) {
    $ip = Get-Prop $ans "IPAddress"
    if ($ip) { $apexIps += $ip }
  }
}
if ($report.apex.AAAA.status -eq "ok") {
  foreach ($ans in @($report.apex.AAAA.answers)) {
    $ip = Get-Prop $ans "IPAddress"
    if ($ip) { $apexIps += $ip }
  }
}
$apexIps = $apexIps | Where-Object { $_ } | Select-Object -Unique
$report.derived.apex_ips = @($apexIps)

foreach ($ip in $apexIps) {
  $report.derived.ptr_lookups += (Get-PtrForIp -Ip $ip)
}

# CAA fallback (native PS only, no CMD; no red error spam)
if ($report.apex.CAA.status -eq "unsupported") {
  $report.derived.caa_nslookup = Nslookup-CAA -Name $Domain
}

# --- write JSON to C:\Temp\<domain>.json ---
$OutDir  = "C:\Temp"
$OutFile = Join-Path $OutDir "$Domain.json"

if (-not (Test-Path $OutDir)) {
  New-Item -Path $OutDir -ItemType Directory -Force | Out-Null
}

$json = $report | ConvertTo-Json -Depth 25
[System.IO.File]::WriteAllText($OutFile, $json, [System.Text.Encoding]::UTF8)

"Saved JSON to: $OutFile"
```

# Check Environment

{{< powershell-environment-report >}}

# Proven Working Environment

{{< notice type="info" title="AI-Generated Content" >}}
This script was tested and verified to work by a human in this environment.
{{< /notice >}}



```json
{
    "PowerShell":  {
                       "PSEdition":  "Desktop",
                       "PSVersion":  "5.1.26100.7462",
                       "Major":  5,
                       "Minor":  1,
                       "Build":  26100,
                       "Revision":  7462,
                       "PreReleaseLabel":  null,
                       "GitCommitId":  null,
                       "PSCompatibleVersions":  [
                                                    "1.0",
                                                    "2.0",
                                                    "3.0",
                                                    "4.0",
                                                    "5.0",
                                                    "5.1.26100.7462"
                                                ],
                       "SerializationVersion":  "1.1.0.1",
                       "WSManStackVersion":  "3.0",
                       "CLRVersion":  "4.0.30319.42000",
                       "BuildVersion":  "10.0.26100.7462"
                   },
    "Host":  {
                 "Name":  "Windows PowerShell ISE Host",
                 "Version":  "5.1.26100.7462",
                 "InstanceId":  "f00fb830-2ac7-460e-af4c-1e61e86a60a3",
                 "IsInteractive":  true,
                 "SupportsVT100":  false,
                 "WindowSize":  null,
                 "BufferSize":  "141x0",
                 "ForegroundColor":  "-1",
                 "BackgroundColor":  "-1"
             },
    "Session":  {
                    "LanguageMode":  "FullLanguage",
                    "RunspaceId":  null,
                    "CurrentLocation":  "C:\\temp",
                    "PSModulePath":  "C:\\Users\\50567920\\Documents\\WindowsPowerShell\\Modules;C:\\Program Files\\WindowsPowerShell\\Modules;C:\\WINDOWS\\system32\\WindowsPowerShell\\v1.0\\Modules;C:\\Program Files (x86)\\Windows Kits\\10\\Microsoft Application Virtualization\\Sequencer\\AppvPkgConverter;C:\\Program Files (x86)\\Windows Kits\\10\\Microsoft Application Virtualization\\Sequencer\\AppvSequencer;C:\\Program Files (x86)\\Windows Kits\\10\\Microsoft Application Virtualization\\;C:\\Program Files\\Thycotic\\Powershell\\",
                    "ExecutionPolicyByScope":  [
                                                   {
                                                       "Scope":  "Process",
                                                       "Policy":  "Undefined"
                                                   },
                                                   {
                                                       "Scope":  "CurrentUser",
                                                       "Policy":  "RemoteSigned"
                                                   },
                                                   {
                                                       "Scope":  "LocalMachine",
                                                       "Policy":  "RemoteSigned"
                                                   },
                                                   {
                                                       "Scope":  "UserPolicy",
                                                       "Policy":  "Undefined"
                                                   },
                                                   {
                                                       "Scope":  "MachinePolicy",
                                                       "Policy":  "Undefined"
                                                   }
                                               ],
                    "ConfirmPreference":  3,
                    "ErrorActionPreference":  1,
                    "ProgressPreference":  2,
                    "VerbosePreference":  0,
                    "WarningPreference":  2,
                    "InformationPreference":  0
                },
    "ModulesLoaded":  [
                          {
                              "Name":  "CimCmdlets",
                              "Version":  "1.0.0.0",
                              "ModuleType":  "Binary",
                              "Path":  "C:\\WINDOWS\\Microsoft.Net\\assembly\\GAC_MSIL\\Microsoft.Management.Infrastructure.CimCmdlets\\v4.0_1.0.0.0__31bf3856ad364e35\\Microsoft.Management.Infrastructure.CimCmdlets.dll"
                          },
                          {
                              "Name":  "DnsClient",
                              "Version":  "1.0.0.0",
                              "ModuleType":  "Manifest",
                              "Path":  "C:\\WINDOWS\\system32\\WindowsPowerShell\\v1.0\\Modules\\DnsClient\\DnsClient.psd1"
                          },
                          {
                              "Name":  "ISE",
                              "Version":  "1.0.0.0",
                              "ModuleType":  "Script",
                              "Path":  "C:\\WINDOWS\\system32\\WindowsPowerShell\\v1.0\\Modules\\ISE\\ISE.psm1"
                          },
                          {
                              "Name":  "Microsoft.PowerShell.Management",
                              "Version":  "3.1.0.0",
                              "ModuleType":  "Manifest",
                              "Path":  "C:\\WINDOWS\\system32\\WindowsPowerShell\\v1.0\\Modules\\Microsoft.PowerShell.Management\\Microsoft.PowerShell.Management.psd1"
                          },
                          {
                              "Name":  "Microsoft.PowerShell.Security",
                              "Version":  "3.0.0.0",
                              "ModuleType":  "Manifest",
                              "Path":  "C:\\WINDOWS\\system32\\WindowsPowerShell\\v1.0\\Modules\\Microsoft.PowerShell.Security\\Microsoft.PowerShell.Security.psd1"
                          },
                          {
                              "Name":  "Microsoft.PowerShell.Utility",
                              "Version":  "3.1.0.0",
                              "ModuleType":  "Manifest",
                              "Path":  "C:\\WINDOWS\\system32\\WindowsPowerShell\\v1.0\\Modules\\Microsoft.PowerShell.Utility\\Microsoft.PowerShell.Utility.psd1"
                          },
                          {
                              "Name":  "Microsoft.WSMan.Management",
                              "Version":  "3.0.0.0",
                              "ModuleType":  "Manifest",
                              "Path":  "C:\\WINDOWS\\system32\\WindowsPowerShell\\v1.0\\Modules\\Microsoft.WSMan.Management\\Microsoft.WSMan.Management.psd1"
                          }
                      ],
    "CommandsSummary":  {
                            "Total":  21380,
                            "ByCommandType":  [
                                                  {
                                                      "Type":  "Alias",
                                                      "Count":  1266
                                                  },
                                                  {
                                                      "Type":  "Cmdlet",
                                                      "Count":  5939
                                                  },
                                                  {
                                                      "Type":  "Filter",
                                                      "Count":  1
                                                  },
                                                  {
                                                      "Type":  "Function",
                                                      "Count":  14174
                                                  }
                                              ],
                            "ByModuleTop20":  [
                                                  {
                                                      "Module":  "Microsoft.Graph.Files",
                                                      "Count":  1252
                                                  },
                                                  {
                                                      "Module":  "Microsoft.Graph.Devices.CorporateManagement",
                                                      "Count":  1164
                                                  },
                                                  {
                                                      "Module":  "Microsoft.Graph.Sites",
                                                      "Count":  1052
                                                  },
                                                  {
                                                      "Module":  "Microsoft.Graph.Identity.Governance",
                                                      "Count":  988
                                                  },
                                                  {
                                                      "Module":  "Az.Network",
                                                      "Count":  893
                                                  },
                                                  {
                                                      "Module":  "Microsoft.Graph.Identity.SignIns",
                                                      "Count":  836
                                                  },
                                                  {
                                                      "Module":  "Microsoft.Graph.Teams",
                                                      "Count":  773
                                                  },
                                                  {
                                                      "Module":  "Microsoft.Graph.Security",
                                                      "Count":  460
                                                  },
                                                  {
                                                      "Module":  "Microsoft.Graph.Notes",
                                                      "Count":  401
                                                  },
                                                  {
                                                      "Module":  "Microsoft.Graph.Identity.DirectoryManagement",
                                                      "Count":  385
                                                  },
                                                  {
                                                      "Module":  "VMware.VimAutomation.Core",
                                                      "Count":  351
                                                  },
                                                  {
                                                      "Module":  "Microsoft.Online.SharePoint.PowerShell",
                                                      "Count":  344
                                                  },
                                                  {
                                                      "Module":  "Az.Sql",
                                                      "Count":  329
                                                  },
                                                  {
                                                      "Module":  "Microsoft.Graph.Applications",
                                                      "Count":  312
                                                  },
                                                  {
                                                      "Module":  "Microsoft.Graph.Education",
                                                      "Count":  297
                                                  },
                                                  {
                                                      "Module":  "Az.Compute",
                                                      "Count":  277
                                                  },
                                                  {
                                                      "Module":  "VMware.Sdk.vSphere.Esx.Settings",
                                                      "Count":  267
                                                  },
                                                  {
                                                      "Module":  "Az.Synapse",
                                                      "Count":  237
                                                  },
                                                  {
                                                      "Module":  "Az.RecoveryServices",
                                                      "Count":  233
                                                  },
                                                  {
                                                      "Module":  "Microsoft.Graph.DeviceManagement",
                                                      "Count":  229
                                                  }
                                              ]
                        }
}

```