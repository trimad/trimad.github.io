---
ai: true
ai-tested-date: 2026-05-04
author: "Tristan Madden"
categories:
  - "System Administration"
date: 2026-05-04
draft: false
summary: "A practical guide to the Windows nslookup command for querying DNS records, changing DNS servers, using interactive mode, and troubleshooting name resolution."
tags:
  - "cmd"
  - "dns"
  - "networking"
  - "nslookup"
  - "troubleshooting"
title: "Nslookup"
toc: true
usePageBundles: true
---

## Overview

`nslookup` is a built-in Windows command-line tool for querying DNS. It can look up hostnames, reverse lookup IP addresses, query specific DNS record types, test against a specific DNS server, and run in an interactive mode for repeated DNS checks.

It is useful when you need to confirm whether a DNS problem is local to one resolver, verify records after a DNS change, check mail records, or compare public DNS answers against an internal DNS server.

## Requirements

- Windows Command Prompt or PowerShell
- Network access to a DNS server
- A domain name, hostname, or IP address to query
- Permission to query the DNS server you are testing

## Basic Syntax

```cmd
nslookup [-option ...]
nslookup [-option ...] - server
nslookup [-option ...] host
nslookup [-option ...] host server
```

The most common form is:

```cmd
nslookup example.com
```

That asks your default DNS resolver for records related to `example.com`.

To enter interactive mode while immediately selecting a DNS server:

```cmd
nslookup - 8.8.8.8
```

## One-Shot Lookups

Use one-shot mode when you only need one answer.

### Look Up a Hostname

```cmd
nslookup www.example.com
```

This returns the DNS server used and the answer for `www.example.com`.

### Use a Specific DNS Server

```cmd
nslookup www.example.com 8.8.8.8
```

This sends the query to Google DNS instead of your default DNS server.

Other common public resolvers:

```cmd
nslookup www.example.com 1.1.1.1
nslookup www.example.com 9.9.9.9
```

### Query a Specific Record Type

```cmd
nslookup -type=mx example.com
```

`-type=mx` asks for mail exchanger records.

Common DNS record types:

| Type | Purpose | Example |
| --- | --- | --- |
| `A` | IPv4 address | `nslookup -type=a example.com` |
| `AAAA` | IPv6 address | `nslookup -type=aaaa example.com` |
| `A+AAAA` | IPv4 and IPv6 addresses | `nslookup -type=a+aaaa example.com` |
| `CNAME` | Alias record | `nslookup -type=cname www.example.com` |
| `MX` | Mail servers | `nslookup -type=mx example.com` |
| `NS` | Authoritative name servers | `nslookup -type=ns example.com` |
| `PTR` | Reverse lookup record | `nslookup -type=ptr 8.8.8.8` |
| `SOA` | Start of authority | `nslookup -type=soa example.com` |
| `SRV` | Service locator record | `nslookup -type=srv _sip._tls.example.com` |
| `TXT` | Text records, including SPF, DKIM, and DMARC | `nslookup -type=txt example.com` |
| `ANY` | Request many record types | `nslookup -type=any example.com` |

`ANY` queries are often filtered or minimized by public DNS services. Query the specific record type when you need reliable results.

### Reverse Lookup an IP Address

```cmd
nslookup 8.8.8.8
```

For IPv4 addresses, `nslookup` automatically performs a reverse lookup and asks for the matching `PTR` record.

### Query a DMARC Record

```cmd
nslookup -type=txt _dmarc.example.com
```

DMARC records are stored as TXT records under `_dmarc`.

### Query a DKIM Record

```cmd
nslookup -type=txt selector1._domainkey.example.com
```

Replace `selector1` with the selector used by the mail platform.

### Query a Microsoft 365 Autodiscover Record

```cmd
nslookup -type=cname autodiscover.example.com
```

For some tenants, Autodiscover may also use SRV records:

```cmd
nslookup -type=srv _autodiscover._tcp.example.com
```

## Interactive Mode

Run `nslookup` with no arguments to enter interactive mode:

```cmd
nslookup
```

You will see a `>` prompt. From there, you can run multiple DNS queries without restarting the command.

Example session:

```text
C:\>nslookup
Default Server:  dns.example.local
Address:  192.168.1.10

> set type=mx
> example.com
> set type=txt
> _dmarc.example.com
> server 8.8.8.8
> example.com
> exit
```

## Interactive Commands

### `NAME`

Query a name using the current DNS server and current options.

```text
> www.example.com
```

If `type` is set to `A`, this asks for IPv4 records. If `type` is set to `MX`, this asks for mail records.

### `NAME1 NAME2`

Query `NAME1` using `NAME2` as the DNS server.

```text
> www.example.com 8.8.8.8
```

This is the interactive equivalent of:

```cmd
nslookup www.example.com 8.8.8.8
```

### `help` or `?`

Show the built-in command list.

```text
> help
```

or:

```text
> ?
```

### `server NAME`

Change the default DNS server by asking the current DNS server to resolve the new server name.

```text
> server 8.8.8.8
```

You can use an IP address or a hostname:

```text
> server dns.google
```

### `lserver NAME`

Change the default DNS server by asking the original DNS server to resolve the new server name.

```text
> lserver 1.1.1.1
```

This is useful if the current server is broken but the original resolver can still resolve the server name you want to use.

### `root`

Change the current default DNS server to the configured root server.

```text
> root
```

The root server can be changed with `set root=NAME`.

### `ls DOMAIN`

List records in a DNS domain.

```text
> ls example.com
```

This attempts a DNS zone transfer. Most public domains and well-configured internal zones block zone transfers except from approved servers, so `ls` commonly fails with a refused or failed transfer message.

### `ls -a DOMAIN`

List canonical names and aliases in a domain.

```text
> ls -a example.com
```

### `ls -d DOMAIN`

List all records in a domain.

```text
> ls -d example.com
```

### `ls -t TYPE DOMAIN`

List only records of a specific type from a domain.

```text
> ls -t MX example.com
```

### `ls DOMAIN > FILE`

Write `ls` output to a file.

```text
> ls -d example.com > dns-zone.txt
```

### `view FILE`

Sort and view an output file created by `ls`.

```text
> view dns-zone.txt
```

On modern Windows systems, opening the output file directly in Notepad or another editor is often more practical:

```cmd
notepad dns-zone.txt
```

### `exit`

Exit interactive mode.

```text
> exit
```

## Set Options

Use `set OPTION` in interactive mode. The same options can usually be passed in one-shot mode with a leading dash, such as `nslookup -type=mx example.com`.

### `set all`

Print the current options, current DNS server, and current host.

```text
> set all
```

### `set debug` and `set nodebug`

Enable or disable debug output.

```text
> set debug
> www.example.com
> set nodebug
```

Debug output shows more detail about the DNS request and response.

One-shot example:

```cmd
nslookup -debug www.example.com
```

### `set d2` and `set nod2`

Enable or disable exhaustive debug output.

```text
> set d2
> www.example.com
> set nod2
```

Use this when normal debug output is not enough. It is verbose.

One-shot example:

```cmd
nslookup -d2 www.example.com
```

### `set defname` and `set nodefname`

Enable or disable appending the default domain name to single-label queries.

```text
> set domain=example.com
> set defname
> server01
```

With `defname` enabled, a query like `server01` can be tried as `server01.example.com`.

Disable it:

```text
> set nodefname
```

### `set recurse` and `set norecurse`

Enable or disable recursive queries.

```text
> set recurse
> www.example.com
```

Disable recursion:

```text
> set norecurse
> www.example.com
```

`norecurse` is useful when testing whether a DNS server is authoritative for a record instead of asking it to resolve the full answer recursively.

### `set search` and `set nosearch`

Enable or disable use of the DNS search list.

```text
> set search
> intranet
```

Disable search list expansion:

```text
> set nosearch
```

### `set vc` and `set novc`

Enable or disable use of a virtual circuit. In practice, this means TCP instead of the usual UDP DNS query.

```text
> set vc
> example.com
```

Disable it:

```text
> set novc
```

Use `vc` when troubleshooting large DNS responses, truncation, or TCP/53 firewall behavior.

### `set domain=NAME`

Set the default domain name.

```text
> set domain=example.com
> server01
```

### `set srchlist=N1[/N2/.../N6]`

Set the domain search list. Up to six domains can be listed, separated by forward slashes.

```text
> set srchlist=corp.example.com/example.com
> server01
```

That lets a short name like `server01` be tried with the configured suffixes.

### `set root=NAME`

Set the root server used by the `root` command.

```text
> set root=a.root-servers.net
> root
```

### `set retry=X`

Set the number of retries.

```text
> set retry=3
> www.example.com
```

One-shot example:

```cmd
nslookup -retry=3 www.example.com
```

### `set timeout=X`

Set the initial timeout in seconds.

```text
> set timeout=10
> www.example.com
```

One-shot example:

```cmd
nslookup -timeout=10 www.example.com
```

### `set type=X`

Set the DNS record type to query.

```text
> set type=mx
> example.com
```

Other examples:

```text
> set type=txt
> example.com
> set type=soa
> example.com
> set type=srv
> _sip._tls.example.com
```

One-shot example:

```cmd
nslookup -type=txt example.com
```

### `set querytype=X`

`querytype` does the same thing as `type`.

```text
> set querytype=ns
> example.com
```

One-shot example:

```cmd
nslookup -querytype=ns example.com
```

### `set class=X`

Set the DNS query class.

```text
> set class=IN
> example.com
```

Common classes:

| Class | Purpose |
| --- | --- |
| `IN` | Internet DNS class; this is the normal default |
| `ANY` | Request any class |

Most everyday DNS troubleshooting uses `IN`.

### `set msxfr` and `set nomsxfr`

Enable or disable Microsoft fast zone transfer.

```text
> set msxfr
> ls -d example.local
```

Disable it:

```text
> set nomsxfr
```

This only matters for zone transfer testing and only when the server allows the transfer.

### `set ixfrver=X`

Set the current version to use in an incremental zone transfer request.

```text
> set ixfrver=2026050401
> ls -d example.local
```

This is for advanced DNS zone transfer troubleshooting. It is not needed for normal record lookups.

## Practical Troubleshooting Examples

### Compare Internal and Public DNS

```cmd
nslookup app.example.com 192.168.1.10
nslookup app.example.com 8.8.8.8
nslookup app.example.com 1.1.1.1
```

If internal DNS returns a private IP and public DNS returns a public IP, split DNS is probably working as intended.

### Check Whether a DNS Server Is Authoritative

```cmd
nslookup -type=ns example.com
```

Then query one of the returned name servers directly:

```cmd
nslookup -type=soa example.com ns1.example.com
```

The SOA answer identifies the authoritative zone details, including the primary name server and serial number.

### Check Email Routing

```cmd
nslookup -type=mx example.com
nslookup -type=txt example.com
nslookup -type=txt _dmarc.example.com
```

These commands check MX, SPF, and DMARC records.

### Check a Service Record

```cmd
nslookup -type=srv _sip._tls.example.com
```

SRV records are commonly used by collaboration, voice, directory, and autodiscovery services.

### Force TCP for DNS

```cmd
nslookup -vc -type=txt example.com
```

This helps test whether DNS over TCP/53 is allowed through the network path.

### Increase Timeout for a Slow Resolver

```cmd
nslookup -timeout=10 -retry=3 example.com
```

Use this when testing a DNS server across a slow VPN or unreliable WAN path.

## Example Output

```text
C:\>nslookup -type=mx example.com
Server:  dns.example.local
Address:  192.168.1.10

Non-authoritative answer:
example.com     MX preference = 0, mail exchanger = mail.example.com
```

The `Server` and `Address` lines show which DNS resolver answered the query. `Non-authoritative answer` means the resolver returned a cached or recursively resolved answer rather than answering as the authoritative DNS server for the zone.

## Notes

- `nslookup` is available in both Command Prompt and PowerShell.
- In PowerShell, `Resolve-DnsName` provides structured objects and is often better for scripting.
- `nslookup` output is text, so avoid depending on it for fragile automation unless you control the output format.
- Zone transfers with `ls` usually fail on public domains because properly configured DNS servers restrict AXFR and IXFR.
- Query specific record types instead of `ANY` when troubleshooting public DNS.
- If a result differs between DNS servers, check whether you are seeing normal caching, split DNS, stale records, or a propagation delay.
