---
ai: true
ai-tested-date: 2026-05-07
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
title: "nslookup"
toc: true
usePageBundles: true
---

## Overview

`nslookup` is a built-in Windows command-line tool for querying DNS. It can look up hostnames, reverse lookup IP addresses, query specific DNS record types, test against a specific DNS server, and run in an interactive mode for repeated DNS checks.

It is useful when you need to confirm whether a DNS problem is local to one resolver, verify records after a DNS change, check mail records, or compare public DNS answers against an internal DNS server.

This guide is organized around the command list shown by `help` inside interactive `nslookup`. The examples appear in the same order as the built-in help output.

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

The most common one-shot lookup is:

```cmd
nslookup example.com
```

That asks your default DNS resolver for records related to `example.com`.

To enter interactive mode, run:

```cmd
nslookup
```

To enter interactive mode while immediately selecting a DNS server:

```cmd
nslookup - 8.8.8.8
```

Interactive examples below use the `>` prompt shown by `nslookup`.

## Help Order Examples

### `NAME`

Print information about host or domain `NAME` using the current default DNS server.

```text
> www.example.com
```

If the query type is set to `A`, this asks for IPv4 records. If the query type is set to `MX`, this asks for mail exchanger records.

Reverse lookups also work from the same prompt:

```text
> 8.8.8.8
```

For an IPv4 address, `nslookup` asks for the matching `PTR` record.

### `NAME1 NAME2`

Print information about `NAME1`, but use `NAME2` as the DNS server for that query.

```text
> www.example.com 8.8.8.8
```

This is the interactive equivalent of:

```cmd
nslookup www.example.com 8.8.8.8
```

You can use a DNS server hostname instead of an IP address:

```text
> www.example.com dns.google
```

### `help` or `?`

Show the built-in list of common interactive commands.

```text
> help
```

The short form is:

```text
> ?
```

### `set OPTION`

Set an interactive `nslookup` option. Most of these options can also be used in one-shot mode with a leading dash.

For example, this interactive command:

```text
> set type=mx
> example.com
```

is similar to this one-shot command:

```cmd
nslookup -type=mx example.com
```

#### `set all`

Print current options, the current default DNS server, and the current host.

```text
> set all
```

Use this when you are several commands into an interactive session and need to confirm the active server, query type, timeout, retry count, and other options.

#### `set debug` and `set nodebug`

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

#### `set d2` and `set nod2`

Enable or disable exhaustive debug output.

```text
> set d2
> www.example.com
> set nod2
```

Use `d2` when normal debug output is not enough. It is very verbose.

One-shot example:

```cmd
nslookup -d2 www.example.com
```

#### `set defname` and `set nodefname`

Enable or disable appending the default domain name to single-label queries.

```text
> set domain=example.com
> set defname
> server01
```

With `defname` enabled, a query like `server01` can be tried as `server01.example.com`.

Disable it with:

```text
> set nodefname
```

#### `set recurse` and `set norecurse`

Enable or disable recursive queries.

```text
> set recurse
> www.example.com
```

Disable recursion with:

```text
> set norecurse
> www.example.com
```

`norecurse` is useful when testing whether a DNS server is authoritative for a record instead of asking it to resolve the full answer recursively.

#### `set search` and `set nosearch`

Enable or disable use of the DNS search list.

```text
> set srchlist=corp.example.com/example.com
> set search
> server01
```

With `search` enabled, `nslookup` can try the configured suffixes for a short name.

Disable search list expansion with:

```text
> set nosearch
```

#### `set vc` and `set novc`

Enable or disable use of a virtual circuit. In practice, this means TCP instead of the usual UDP DNS query.

```text
> set vc
> example.com
```

Disable it with:

```text
> set novc
```

Use `vc` when troubleshooting large DNS responses, truncation, or TCP/53 firewall behavior.

One-shot example:

```cmd
nslookup -vc -type=txt example.com
```

#### `set domain=NAME`

Set the default domain name.

```text
> set domain=example.com
> server01
```

This is commonly used with `set defname` or `set search` so that short names can be expanded with a DNS suffix.

#### `set srchlist=N1[/N2/.../N6]`

Set the domain search list. Up to six domains can be listed, separated by forward slashes.

```text
> set srchlist=corp.example.com/example.com
> server01
```

That lets a short name like `server01` be tried with the configured suffixes.

#### `set root=NAME`

Set the root server used by the `root` command.

```text
> set root=a.root-servers.net
> root
```

This does not immediately query a record. It changes which DNS server `nslookup` switches to when you run `root`.

#### `set retry=X`

Set the number of retries.

```text
> set retry=3
> www.example.com
```

One-shot example:

```cmd
nslookup -retry=3 www.example.com
```

Use this when testing a DNS server across a slow VPN, unreliable WAN path, or busy resolver.

#### `set timeout=X`

Set the initial timeout in seconds.

```text
> set timeout=10
> www.example.com
```

One-shot example:

```cmd
nslookup -timeout=10 www.example.com
```

#### `set type=X`

Set the DNS record type to query.

```text
> set type=mx
> example.com
```

Common DNS record types:

| Type | Purpose | Example |
| --- | --- | --- |
| `A` | IPv4 address | `set type=a` |
| `AAAA` | IPv6 address | `set type=aaaa` |
| `A+AAAA` | IPv4 and IPv6 addresses | `set type=a+aaaa` |
| `CNAME` | Alias record | `set type=cname` |
| `MX` | Mail servers | `set type=mx` |
| `NS` | Authoritative name servers | `set type=ns` |
| `PTR` | Reverse lookup record | `set type=ptr` |
| `SOA` | Start of authority | `set type=soa` |
| `SRV` | Service locator record | `set type=srv` |
| `TXT` | Text records, including SPF, DKIM, and DMARC | `set type=txt` |
| `ANY` | Request many record types | `set type=any` |

One-shot examples:

```cmd
nslookup -type=mx example.com
nslookup -type=txt _dmarc.example.com
nslookup -type=srv _sip._tls.example.com
```

`ANY` queries are often filtered or minimized by public DNS services. Query the specific record type when you need reliable results.

#### `set querytype=X`

Set the DNS query type. `querytype` does the same thing as `type`.

```text
> set querytype=ns
> example.com
```

One-shot example:

```cmd
nslookup -querytype=ns example.com
```

#### `set class=X`

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

#### `set msxfr` and `set nomsxfr`

Enable or disable Microsoft fast zone transfer.

```text
> set msxfr
> ls -d example.local
> set nomsxfr
```

This only matters for zone transfer testing, and only when the DNS server allows the transfer.

#### `set ixfrver=X`

Set the current version to use in an incremental zone transfer request.

```text
> set ixfrver=2026050401
> ls -d example.local
```

This is for advanced DNS zone transfer troubleshooting. It is not needed for normal record lookups.

### `server NAME`

Set the default DNS server to `NAME`, using the current default server to resolve `NAME` if needed.

```text
> server 8.8.8.8
```

You can use an IP address or a hostname:

```text
> server dns.google
```

After changing the server, later `NAME` queries use that DNS server:

```text
> server 1.1.1.1
> www.example.com
```

### `lserver NAME`

Set the default DNS server to `NAME`, using the initial DNS server to resolve `NAME` if needed.

```text
> lserver 1.1.1.1
```

This is useful if the current server is broken but the original resolver can still resolve the server name you want to use.

### `root`

Set the current default DNS server to the configured root server.

```text
> root
```

The root server can be changed first:

```text
> set root=a.root-servers.net
> root
```

### `ls [opt] DOMAIN [> FILE]`

List records in a DNS domain.

```text
> ls example.local
```

This attempts a DNS zone transfer. Most public domains and well-configured internal zones block zone transfers except from approved servers, so `ls` commonly fails with a refused or failed transfer message.

Write the output to a file with:

```text
> ls example.local > dns-zone.txt
```

#### `ls -a DOMAIN`

List canonical names and aliases in a domain.

```text
> ls -a example.local
```

This is useful when reviewing host aliases in a zone that allows transfers.

#### `ls -d DOMAIN`

List all records in a domain.

```text
> ls -d example.local
```

Use this when you need a broader zone listing instead of only address records.

#### `ls -t TYPE DOMAIN`

List only records of the given DNS record type.

```text
> ls -t MX example.local
```

Other examples:

```text
> ls -t NS example.local
> ls -t CNAME example.local
```

### `view FILE`

Sort an `ls` output file and view it with `pg`.

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

### Check Microsoft 365 Autodiscover

```cmd
nslookup -type=cname autodiscover.example.com
nslookup -type=srv _autodiscover._tcp.example.com
```

Some tenants use CNAME records, while others may also depend on SRV records.

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
