---
author: Tristan Madden
categories: [Shell]
date: 2023-04-13
tags: [net, drives, printers]
title: net use
thumbnail: "thumbnail.png"
summary: Connects a computer to or disconnects a computer from a shared resource, or displays information about computer connections. The command also controls persistent net connections. Used without parameters, net use retrieves a list of network connections.
usePageBundles: true
toc: true
---

Connects a computer to or disconnects a computer from a shared resource, or displays information about computer connections. The command also controls persistent net connections. Used without parameters, net use retrieves a list of network connections.

## Map a network drive
To map a network drive, use the following command:

```Shell
net use X: \\<your>\<UNC>\<path>
```
To map a network drive with specific credentials (username and password), use the following command:

```Shell
net use X: \\<your>\<UNC>\<path> /user:<domain>\<username> <password>
```

## Disconnect a network drive
To disconnect a network drive, use the following command:

```Shell
net use X: /delete
```
Replace "X" with the appropriate drive letter.

## Registry
Mapped network drives are stored in the Windows Registry under the following key:

```
HKEY_CURRENT_USER\Network
```

Each subkey represents a mapped network drive, with the drive letter as the subkey name.  Inside each subkey, you will find various values related to the configuration of that mapped network drive.

Common values found within the subkeys:

`RemotePath`: A REG_SZ value that contains the UNC path of the mapped network drive (e.g., \\server\share).

`UserName`: A REG_SZ value that stores the username used to authenticate with the shared resource, if any.

`ProviderName`: A REG_SZ value that contains the name of the network provider responsible for managing the connection (e.g., "Microsoft Windows Network").

`ConnectionType`: A REG_DWORD value that indicates the type of the network resource being connected to. For example, a value of 1 indicates a disk drive, and a value of 2 indicates a printer.

`DeferFlags`: A REG_DWORD value that may control some connection and disconnection settings for the mapped network drive.

`UseOptions`: A REG_BINARY value containing various settings and options associated with the mapped network drive. The binary data is not designed to be human-readable and is managed by Windows and other tools.

## Persistent network drive
To map a network drive that will persist after a system reboot, add the /persistent parameter:

```Shell
net use X: \\<your>\<UNC>\<path> /persistent:yes
```
To disable persistence when mapping a network drive, use /persistent:no.

## Other use cases
Display the current network connections:
```Shell
net use
```
Connect to a shared printer:
```Shell
net use LPT1: \\<your>\<UNC>\<path> /persistent:yes
```
Replace "LPT1" with the appropriate printer port.

Disconnect from a shared resource by specifying the UNC path:
```Shell
net use \\<your>\<UNC>\<path> /delete
```
Connect to a shared resource using a different username and password, without mapping a drive letter:

```Shell
net use \\<your>\<UNC>\<path> /user:<domain>\<username> <password>
```