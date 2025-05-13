---
author: Tristan Madden
categories: [Windows, Security, System Administration]
date: 2023-03-03
draft: false
summary: "A comprehensive guide to managing Windows Defender Firewall via command line, covering firewall state management, program exceptions, Remote Desktop configuration, and port forwarding."
tags: [windows, security, firewall, netsh, system-administration, windows-defender, network-security, command-line, rdp, port-management]
title: "Windows Defender Firewall Management Guide"
toc: true
usePageBundles: true
---

<h2>Firewall Rules</h2>

<h3>Turn the firewall on or off</h3>

```Shell
netsh advfirewall set allprofiles state on
netsh advfirewall set allprofiles state off
```
<h3>Exception for a program</h3>
This example allows incoming traffic for the program "WaspPunch.exe" located at "C:\Program Files (x86)\Wasp Technologies\WaspTime\WaspPunch.exe". The "dir=in" parameter specifies that the rule applies to inbound traffic. The "action=allow" parameter allows the traffic through, and "enable=yes" ensures that the rule is enabled.

```Shell
netsh advfirewall firewall add rule name="WaspPunch.exe" dir=in action=allow program="C:\Program Files (x86)\Wasp Technologies\WaspTime\WaspPunch.exe" enable=yes
```

<h3>Exception for Remote Desktop</h3>
You do not need to create a separate exception for the port when whitelisting "remote desktop". When you enable the "remote desktop" rule group using this command it automatically allows traffic on the default Remote Desktop Protocol (RDP) port, which is TCP port 3389.

```Shell
netsh advfirewall firewall set rule group="remote desktop" new enable=yes
```

<h3>Exception for a port</h3>
These rules allow incoming TCP traffic on ports 10004 and 10005. Again, the "dir=in" parameter specifies that the rules apply to inbound traffic, "action=allow" allows the traffic through, and "enable=yes" ensures that the rules are enabled.

```Shell
netsh advfirewall firewall add rule name="10004" dir=in action=allow protocol=TCP localport=10004 enable=yes
netsh advfirewall firewall add rule name="10005" dir=in action=allow protocol=TCP localport=10005 enable=yes
```