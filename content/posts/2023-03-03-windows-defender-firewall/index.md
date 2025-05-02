---
author: Tristan Madden
categories: [Shell]
date: 2023-03-03
lastmod: 2023-03-07
tags: [netsh, firewall]
thumbnail: "thumbnail.png"
title: Windows Defender Firewall
summary: Examples of rules are commonly used in network setups where specific programs or ports need to be allowed through the firewall to ensure that they can communicate with other devices or software.
ShowReadingTime: true
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