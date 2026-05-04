---
ai: true
ai-tested-date: 2026-04-09
author: "Tristan Madden"
categories:
  - "PowerShell"
  - "Networking"
  - "Windows"
date: 2026-04-09
draft: false
summary: "Scan a single IP, IP range, or CIDR subnet from a Windows PowerShell GUI, resolve hostnames, attempt ARP MAC lookup, optionally test TCP ports, and export the results to CSV."
tags:
  - "powershell"
  - "networking"
  - "subnet-scanner"
  - "port-scanner"
  - "winforms"
title: "PowerShell Subnet Scanner With Optional Port Checks"
toc: true
usePageBundles: true
---

## Overview

When I want a quick inventory of live systems on a subnet, I do not always want to drop into a separate network tool or memorize another command-line syntax. Sometimes I just need a simple Windows GUI that can scan a target, show which hosts respond, and optionally test a few TCP ports while I am troubleshooting.

This PowerShell script builds a small WinForms scanner for exactly that job. It accepts a single IPv4 address, an explicit IPv4 range, or CIDR notation such as `192.168.1.0/24`. For each host, it can send a ping, try one or more TCP ports, resolve the hostname, attempt to read the MAC address through ARP, and then display everything in a sortable grid that can be exported to CSV.

## Requirements

- A Windows system running PowerShell with access to `System.Windows.Forms`
- IPv4 network access to the target host or subnet you want to scan
- Permission to reach the systems and ports you are testing
- ICMP allowed if you want ping responses, though open TCP ports can still mark a host as responsive
- Permission to write a CSV file if you plan to export results

## Key Capabilities

- Accepts a single IPv4 address, a start-end range, or CIDR notation
- Expands the target into a full list of IPv4 hosts before scanning
- Sends ICMP echo requests and records round-trip time and TTL when available
- Optionally tests TCP ports from a comma-separated list and/or port ranges
- Marks a host as responsive if it answers ping or if one of the requested TCP ports is open
- Resolves DNS hostnames for responsive hosts
- Attempts MAC address lookup through `SendARP`
- Lets you filter the grid to show only alive or open systems
- Exports the displayed results to CSV
- Supports cancelling the scan from the GUI

## Download

{{< download-resource file="PowerShell-Subnet-Scanner.ps1" title="PowerShell Script" label="Download PowerShell-Subnet-Scanner.ps1" >}}
This post bundles the exact PowerShell script described below as a page resource, so the download link points directly to the script in this post folder.
{{< /download-resource >}}

## The Script

```powershell
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

if (-not ("ArpHelper" -as [type])) {
Add-Type -Language CSharp @"
using System;
using System.Net;
using System.Runtime.InteropServices;

public static class ArpHelper {
    [DllImport("iphlpapi.dll", ExactSpelling = true)]
    private static extern int SendARP(int destIp, int srcIp, byte[] macAddr, ref int macLen);

    public static string GetMac(IPAddress ip) {
        if (ip == null || ip.AddressFamily != System.Net.Sockets.AddressFamily.InterNetwork)
            return null;

        int dest = BitConverter.ToInt32(ip.GetAddressBytes(), 0);
        byte[] mac = new byte[6];
        int len = mac.Length;

        int res = SendARP(dest, 0, mac, ref len);
        if (res != 0 || len == 0) return null;

        string[] parts = new string[len];
        for (int i = 0; i < len; i++)
            parts[i] = mac[i].ToString("X2");

        return string.Join(":", parts);
    }
}
"@
}

function Convert-IPToUInt32 {
    param([Parameter(Mandatory=$true)][System.Net.IPAddress]$IP)
    $bytes = $IP.GetAddressBytes()
    if ($bytes.Length -ne 4) { throw "IPv4 only." }
    [Array]::Reverse($bytes)
    return [BitConverter]::ToUInt32($bytes, 0)
}

function Convert-UInt32ToIP {
    param([Parameter(Mandatory=$true)][UInt32]$Value)
    $bytes = [BitConverter]::GetBytes($Value)
    [Array]::Reverse($bytes)
    return [System.Net.IPAddress]::new($bytes)
}

function Get-IPListFromTarget {
    param([Parameter(Mandatory=$true)][string]$Target)

    $Target = $Target.Trim()

    if ($Target -match "/") {
        $parts = $Target.Split("/", 2)
        if ($parts.Count -ne 2) { throw "Invalid CIDR format. Example: 192.168.1.0/24" }

        [System.Net.IPAddress]$ip = $parts[0].Trim()
        [int]$prefix = $parts[1].Trim()

        if ($ip.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) {
            throw "IPv4 only."
        }
        if ($prefix -lt 0 -or $prefix -gt 32) {
            throw "CIDR prefix must be between 0 and 32."
        }

        [uint64]$ipVal = Convert-IPToUInt32 $ip

        if ($prefix -eq 0) {
            [uint64]$network = 0
            [uint64]$broadcast = 4294967295
        }
        else {
            [uint64]$hostCount = [uint64][math]::Pow(2, (32 - $prefix))
            [uint64]$network = [math]::Floor($ipVal / $hostCount) * $hostCount
            [uint64]$broadcast = $network + $hostCount - 1
        }

        if ($prefix -ge 31) {
            [uint64]$first = $network
            [uint64]$last = $broadcast
        }
        else {
            [uint64]$first = $network + 1
            [uint64]$last = $broadcast - 1
        }

        $list = New-Object System.Collections.Generic.List[System.Net.IPAddress]
        for ([uint64]$i = $first; $i -le $last; $i++) {
            $list.Add((Convert-UInt32ToIP ([uint32]$i)))
        }
        return $list
    }

    if ($Target -match "-") {
        $parts = $Target.Split("-", 2)
        if ($parts.Count -ne 2) { throw "Invalid range format. Example: 192.168.1.10-192.168.1.50" }

        [System.Net.IPAddress]$startIp = $parts[0].Trim()
        [System.Net.IPAddress]$endIp = $parts[1].Trim()

        if ($startIp.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork -or
            $endIp.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) {
            throw "IPv4 only."
        }

        [uint64]$start = Convert-IPToUInt32 $startIp
        [uint64]$end = Convert-IPToUInt32 $endIp

        if ($end -lt $start) {
            throw "End IP must be greater than or equal to start IP."
        }

        $list = New-Object System.Collections.Generic.List[System.Net.IPAddress]
        for ([uint64]$i = $start; $i -le $end; $i++) {
            $list.Add((Convert-UInt32ToIP ([uint32]$i)))
        }
        return $list
    }

    [System.Net.IPAddress]$single = $Target
    if (-not $single) { throw "Invalid IP address." }
    if ($single.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) {
        throw "IPv4 only."
    }

    $list = New-Object System.Collections.Generic.List[System.Net.IPAddress]
    $list.Add($single)
    return $list
}

function Parse-PortList {
    param([string]$PortsText)

    if ([string]::IsNullOrWhiteSpace($PortsText)) {
        return [int[]]@()
    }

    $ports = New-Object System.Collections.Generic.List[int]

    foreach ($piece in ($PortsText -split ",")) {
        $item = $piece.Trim()
        if ([string]::IsNullOrWhiteSpace($item)) { continue }

        if ($item -match "^\d+$") {
            $p = [int]$item
            if ($p -lt 1 -or $p -gt 65535) { throw "Invalid port: $item" }
            $ports.Add($p)
        }
        elseif ($item -match "^(\d+)\s*-\s*(\d+)$") {
            $start = [int]$matches[1]
            $end = [int]$matches[2]
            if ($start -lt 1 -or $end -gt 65535 -or $end -lt $start) {
                throw "Invalid port range: $item"
            }
            for ($p = $start; $p -le $end; $p++) {
                $ports.Add($p)
            }
        }
        else {
            throw "Invalid port entry: $item"
        }
    }

    return [int[]]($ports | Select-Object -Unique | Sort-Object)
}

function Test-TcpPort {
    param(
        [Parameter(Mandatory=$true)][string]$IP,
        [Parameter(Mandatory=$true)][int]$Port,
        [Parameter(Mandatory=$true)][int]$TimeoutMs
    )

    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $iar = $client.BeginConnect($IP, $Port, $null, $null)
        $connected = $iar.AsyncWaitHandle.WaitOne($TimeoutMs, $false)
        if (-not $connected) { return $false }
        $client.EndConnect($iar) | Out-Null
        return $true
    }
    catch {
        return $false
    }
    finally {
        $client.Close()
    }
}

function Scan-Host {
    param(
        [Parameter(Mandatory=$true)][System.Net.IPAddress]$IP,
        [AllowEmptyCollection()][int[]]$Ports = @(),
        [Parameter(Mandatory=$true)][int]$TimeoutMs
    )

    $ipString = $IP.ToString()
    $alive = $false
    $rtt = -1
    $ttl = -1
    $hostname = ""
    $mac = ""
    $openPorts = New-Object System.Collections.Generic.List[int]

    try {
        $ping = New-Object System.Net.NetworkInformation.Ping
        $reply = $ping.Send($IP, $TimeoutMs)
        if ($reply.Status -eq [System.Net.NetworkInformation.IPStatus]::Success) {
            $alive = $true
            $rtt = [int]$reply.RoundtripTime
            if ($reply.Options) { $ttl = [int]$reply.Options.Ttl }
        }
    }
    catch { }

    if ($Ports.Count -gt 0) {
        foreach ($port in $Ports) {
            if (Test-TcpPort -IP $ipString -Port $port -TimeoutMs $TimeoutMs) {
                $openPorts.Add($port)
                $alive = $true
            }
        }
    }

    if ($alive) {
        try { $hostname = [System.Net.Dns]::GetHostEntry($IP).HostName } catch { }
        try { $mac = [ArpHelper]::GetMac($IP) } catch { }
    }

    [PSCustomObject]@{
        IP        = $ipString
        Alive     = $alive
        RTTms     = $rtt
        TTL       = $ttl
        Hostname  = $hostname
        MAC       = $mac
        OpenPorts = ($openPorts -join ",")
    }
}

[System.Windows.Forms.Application]::EnableVisualStyles()

$script:StopScan = $false
$script:AllResults = @()

$form = New-Object System.Windows.Forms.Form
$form.Text = "PowerShell Port Scanner"
$form.StartPosition = "CenterScreen"
$form.Size = New-Object System.Drawing.Size(1120, 650)
$form.MinimumSize = New-Object System.Drawing.Size(900, 500)

$lblTarget = New-Object System.Windows.Forms.Label
$lblTarget.Text = "Target:"
$lblTarget.Location = New-Object System.Drawing.Point(10, 14)
$lblTarget.AutoSize = $true

$txtTarget = New-Object System.Windows.Forms.TextBox
$txtTarget.Location = New-Object System.Drawing.Point(60, 10)
$txtTarget.Size = New-Object System.Drawing.Size(230, 22)
$txtTarget.Text = "192.168.1.0/24"

$lblPorts = New-Object System.Windows.Forms.Label
$lblPorts.Text = "Ports:"
$lblPorts.Location = New-Object System.Drawing.Point(305, 14)
$lblPorts.AutoSize = $true

$txtPorts = New-Object System.Windows.Forms.TextBox
$txtPorts.Location = New-Object System.Drawing.Point(345, 10)
$txtPorts.Size = New-Object System.Drawing.Size(250, 22)
$txtPorts.Text = ""

$lblTimeout = New-Object System.Windows.Forms.Label
$lblTimeout.Text = "Timeout (ms):"
$lblTimeout.Location = New-Object System.Drawing.Point(610, 14)
$lblTimeout.AutoSize = $true

$numTimeout = New-Object System.Windows.Forms.NumericUpDown
$numTimeout.Location = New-Object System.Drawing.Point(695, 10)
$numTimeout.Minimum = 100
$numTimeout.Maximum = 10000
$numTimeout.Value = 500
$numTimeout.Width = 80

$chkAliveOnly = New-Object System.Windows.Forms.CheckBox
$chkAliveOnly.Text = "Alive/Open only"
$chkAliveOnly.Location = New-Object System.Drawing.Point(790, 12)
$chkAliveOnly.AutoSize = $true

$btnStart = New-Object System.Windows.Forms.Button
$btnStart.Text = "Start Scan"
$btnStart.Location = New-Object System.Drawing.Point(915, 8)
$btnStart.Size = New-Object System.Drawing.Size(85, 28)

$btnStop = New-Object System.Windows.Forms.Button
$btnStop.Text = "Stop"
$btnStop.Location = New-Object System.Drawing.Point(1008, 8)
$btnStop.Size = New-Object System.Drawing.Size(70, 28)
$btnStop.Enabled = $false

$grid = New-Object System.Windows.Forms.DataGridView
$grid.Location = New-Object System.Drawing.Point(10, 45)
$grid.Size = New-Object System.Drawing.Size(1084, 525)
$grid.Anchor = "Top,Bottom,Left,Right"
$grid.ReadOnly = $true
$grid.AllowUserToAddRows = $false
$grid.AllowUserToDeleteRows = $false
$grid.AutoSizeColumnsMode = "Fill"
$grid.RowHeadersVisible = $false
$grid.SelectionMode = "FullRowSelect"
$grid.MultiSelect = $false

$dt = New-Object System.Data.DataTable
[void]$dt.Columns.Add("IP", [string])
[void]$dt.Columns.Add("Alive", [bool])
[void]$dt.Columns.Add("RTTms", [int])
[void]$dt.Columns.Add("TTL", [int])
[void]$dt.Columns.Add("Hostname", [string])
[void]$dt.Columns.Add("MAC", [string])
[void]$dt.Columns.Add("OpenPorts", [string])
$grid.DataSource = $dt

$progress = New-Object System.Windows.Forms.ProgressBar
$progress.Location = New-Object System.Drawing.Point(10, 578)
$progress.Size = New-Object System.Drawing.Size(380, 18)
$progress.Anchor = "Left,Bottom"

$btnExport = New-Object System.Windows.Forms.Button
$btnExport.Text = "Export CSV"
$btnExport.Location = New-Object System.Drawing.Point(400, 574)
$btnExport.Size = New-Object System.Drawing.Size(90, 26)
$btnExport.Anchor = "Left,Bottom"

$lblStatus = New-Object System.Windows.Forms.Label
$lblStatus.Text = "Ready"
$lblStatus.Location = New-Object System.Drawing.Point(500, 578)
$lblStatus.Size = New-Object System.Drawing.Size(594, 18)
$lblStatus.Anchor = "Left,Bottom,Right"

$lblCounts = New-Object System.Windows.Forms.Label
$lblCounts.Text = "Total: 0   Scanned: 0   Responsive: 0"
$lblCounts.Location = New-Object System.Drawing.Point(10, 600)
$lblCounts.Size = New-Object System.Drawing.Size(500, 18)
$lblCounts.Anchor = "Left,Bottom"

$form.Controls.AddRange(@(
    $lblTarget, $txtTarget,
    $lblPorts, $txtPorts,
    $lblTimeout, $numTimeout,
    $chkAliveOnly,
    $btnStart, $btnStop,
    $grid,
    $progress, $btnExport, $lblStatus, $lblCounts
))

function Add-ResultRow {
    param([Parameter(Mandatory=$true)]$Result)

    if ($chkAliveOnly.Checked -and -not $Result.Alive) { return }

    $row = $dt.NewRow()
    $row["IP"] = $Result.IP
    $row["Alive"] = $Result.Alive
    $row["RTTms"] = $Result.RTTms
    $row["TTL"] = $Result.TTL
    $row["Hostname"] = $Result.Hostname
    $row["MAC"] = $Result.MAC
    $row["OpenPorts"] = $Result.OpenPorts
    [void]$dt.Rows.Add($row)
}

function Rebuild-Grid {
    param([Parameter(Mandatory=$true)][object[]]$Results)
    $dt.Rows.Clear()
    foreach ($result in $Results) {
        Add-ResultRow -Result $result
    }
}

$chkAliveOnly.Add_CheckedChanged({
    Rebuild-Grid -Results $script:AllResults
})

$btnExport.Add_Click({
    if ($dt.Rows.Count -eq 0) {
        [System.Windows.Forms.MessageBox]::Show("There are no results to export.", "Nothing to export", "OK", "Information") | Out-Null
        return
    }

    $dialog = New-Object System.Windows.Forms.SaveFileDialog
    $dialog.Filter = "CSV files (*.csv)|*.csv|All files (*.*)|*.*"
    $dialog.FileName = "portscan_results.csv"

    if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $export = foreach ($r in $script:AllResults) {
            if ($chkAliveOnly.Checked -and -not $r.Alive) { continue }
            [PSCustomObject]@{
                IP        = $r.IP
                Alive     = $r.Alive
                RTTms     = $r.RTTms
                TTL       = $r.TTL
                Hostname  = $r.Hostname
                MAC       = $r.MAC
                OpenPorts = $r.OpenPorts
            }
        }

        $export | Export-Csv -Path $dialog.FileName -NoTypeInformation -Encoding UTF8
        [System.Windows.Forms.MessageBox]::Show("Export complete.", "Done", "OK", "Information") | Out-Null
    }
})

$btnStop.Add_Click({
    $script:StopScan = $true
    $btnStop.Enabled = $false
    $lblStatus.Text = "Stopping..."
})

$btnStart.Add_Click({
    try {
        $script:StopScan = $false
        $script:AllResults = @()
        $dt.Rows.Clear()

        $ips = Get-IPListFromTarget -Target $txtTarget.Text
        [int[]]$ports = @(Parse-PortList -PortsText $txtPorts.Text)
        $timeout = [int]$numTimeout.Value

        $total = $ips.Count
        $scanned = 0
        $responsive = 0

        $progress.Minimum = 0
        $progress.Maximum = [Math]::Max(1, $total)
        $progress.Value = 0

        $lblCounts.Text = "Total: $total   Scanned: 0   Responsive: 0"
        if ($ports.Count -gt 0) {
            $lblStatus.Text = "Scanning hosts and ports..."
        }
        else {
            $lblStatus.Text = "Scanning hosts..."
        }

        $btnStart.Enabled = $false
        $btnStop.Enabled = $true

        foreach ($ip in $ips) {
            [System.Windows.Forms.Application]::DoEvents()
            if ($script:StopScan) { break }

            $result = Scan-Host -IP $ip -Ports $ports -TimeoutMs $timeout
            $script:AllResults += $result

            if ($result.Alive) { $responsive++ }

            Add-ResultRow -Result $result

            $scanned++
            if ($progress.Value -lt $progress.Maximum) { $progress.Value = $scanned }
            $lblCounts.Text = "Total: $total   Scanned: $scanned   Responsive: $responsive"
            $lblStatus.Text = "Last: $($result.IP)"
        }

        if ($script:StopScan) {
            $lblStatus.Text = "Cancelled"
        }
        else {
            $lblStatus.Text = "Done"
        }
    }
    catch {
        [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, "Error", "OK", "Error") | Out-Null
        $lblStatus.Text = "Error"
    }
    finally {
        $btnStart.Enabled = $true
        $btnStop.Enabled = $false
    }
})

[void]$form.ShowDialog()
```

## How to Use

1. Download `PowerShell-Subnet-Scanner.ps1` to a Windows system that can reach the target network.
2. Launch the script from PowerShell:

```powershell
.\PowerShell-Subnet-Scanner.ps1
```

3. In the `Target` field, enter one of the supported formats:

```text
192.168.1.15
192.168.1.10-192.168.1.50
192.168.1.0/24
```

4. Optionally enter ports in the `Ports` field. You can mix single ports and ranges, for example:

```text
22,80,443,3389
1-1024
80,443,8000-8100
```

5. Adjust `Timeout (ms)` if you need slower probes on high-latency links or faster scans on a quiet LAN.
6. Click `Start Scan` and watch the results populate in the grid.
7. If you only care about responsive hosts, enable `Alive/Open only`.
8. Click `Export CSV` to save the current result set for later review.

## Example Output

The script is GUI-based, so the live results appear in the grid rather than the console. A typical scan and CSV export might look like this:

```text
Status: Scanning hosts and ports...
Total: 254   Scanned: 254   Responsive: 4
Status: Done

IP,Alive,RTTms,TTL,Hostname,MAC,OpenPorts
192.168.1.1,True,1,64,router.local,AA:BB:CC:DD:EE:FF,"80,443"
192.168.1.10,True,2,128,fileserver.contoso.local,11:22:33:44:55:66,"445,3389"
192.168.1.25,False,-1,-1,,,
192.168.1.40,True,3,128,ws-40.contoso.local,77:88:99:AA:BB:CC,""
```

## Notes

- This script is IPv4-only. It rejects IPv6 addresses, ranges, and CIDR targets.
- MAC lookup is best-effort. Because it uses ARP through `iphlpapi.dll`, it is most reliable for systems on the same local subnet.
- A host can still be marked `Alive` even if it does not answer ping, as long as one of the requested TCP ports accepts a connection.
- Port parsing removes duplicates and sorts the final list before scanning.
- The scan is sequential, not parallel. Large subnets, broad port ranges, or long timeouts will make it take longer to finish.
- `Stop` cancels the scan between hosts. If the current host is still being tested, cancellation takes effect after that host finishes.
- The window title is currently `PowerShell Port Scanner`, even though the script also works well as a subnet scanner.
