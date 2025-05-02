---
author: Tristan Madden
categories: [DNS]
date: 2024-06-06
draft: false
featured: false
summary: "A cheat sheet with a comprehensive list of options for DNS records."
tags: [DNS]
thumbnail: "thumbnail.png"
title: "DNS Records"
toc: true
usePageBundles: true
---

## DMARC
DMARC (Domain-based Message Authentication, Reporting, and Conformance) is an email authentication protocol that builds on SPF and DKIM (DomainKeys Identified Mail). It allows domain owners to publish policies on how email from their domain should be handled if it fails authentication checks. DMARC provides a way to monitor and improve the security of email sent from your domain, reducing the risk of phishing and email spoofing.

### v (version)
&nbsp;Specifies the DMARC version. It is mandatory and must be included.
```
v=DMARC1;
```
There are no other versions of DMARC currently in use or specified.

### p (Policy)
Specifies the action to be taken on emails that fail authentication checks.
#### none
No action is taken; only monitoring is performed.
```
p=none;
```
#### quarantine
Messages that fail DMARC checks are treated with suspicion.
```
p=quarantine;
```
#### reject
Messages that fail DMARC checks are rejected outright.
```
p=reject;
```

### sp (Subdomain Policy)
Specifies the policy to be applied to emails from subdomains.
#### none
No action is taken for subdomains; only monitoring.
```
sp=none;
```
#### quarantine
Subdomain messages that fail DMARC checks are treated with suspicion.
```
sp=quarantine;
```
#### reject
Subdomain messages that fail DMARC checks are rejected outright.
```
sp=reject;
```

### pct (Percentage)
Percentage of messages to which the policy is applied. Can be any number from 1 to 100.
```
pct=50;
```

### rua (Aggregate Reports)
Email address(es) to send aggregate reports to. Multiple addresses can be separated by commas.
```
rua=mailto:aggregate@example.com,mailto:another@example.com;
```

### ruf (Forensic Reports)
Email address(es) to send forensic (failure) reports to. Multiple addresses can be separated by commas.
```
ruf=mailto:forensic@example.com,mailto:anotherforensic@example.com;
```

### fo (Forensic Options)
#### 0
Generate reports if all checks fail (default).
```
fo=0;
```
#### 1
Generate reports if any single check fails.
```
fo=1;
```
#### d
Generate reports if DKIM fails.
```
fo=d;
```
#### s
Generate reports if SPF fails.
```
fo=s;
```

### rf (Report Format)
#### afrf
Authentication Failure Reporting Format (default).
```
rf=afrf;
```
#### rf=iodef
Incident Object Description Exchange Format.
```
rf=iodef;
```

### ri (Report Interval)
Interval in seconds between aggregate reports (default is 86400 seconds or 24 hours).
```
ri=86400;
```
### adkim (DKIM Alignment)
Specifies the alignment mode for DKIM authentication.
#### r
Relaxed mode (default).
```
adkim=r;
```
#### s
Strict mode.
```
adkim=s;
```

### aspf (SPF Alignment)
#### r
Relaxed mode (default).
```
aspf=r;
```
#### s
Strict mode.
```
aspf=s;
```

## MX
MX (Mail Exchange) records are DNS records that specify the mail servers responsible for receiving email on behalf of your domain. These records direct email to the correct mail server and are essential for the functioning of email services. Properly configured MX records ensure that emails are reliably delivered to your domain.

### Priority
Specifies the priority of the mail server. Lower values have higher priority.
```
10;
```
Higher priority MX records are tried first.

### Mail Server
Specifies the fully qualified domain name (FQDN) of the mail server.
```
mail.example.com;
```
The FQDN must be an A or AAAA record.

### TTL (Time to Live)
Specifies the time in seconds that the record may be cached by resolvers.
```
3600;
```
The default value is typically 3600 seconds (1 hour).

### Example MX Record
An MX record consists of a priority and a mail server.
```
10 mail.example.com;
```
In this example, `mail.example.com` is the mail server with a priority of 10.

### Multiple MX Records
Multiple MX records can be specified to provide redundancy.
#### Example
```
10 mail1.example.com;
20 mail2.example.com;
```
`mail1.example.com` has a higher priority and will be tried first. If it fails, `mail2.example.com` will be used.

### Setting Up MX Records
1. **Access your DNS provider's management console.**
2. **Navigate to the DNS settings for your domain.**
3. **Add a new MX record with the appropriate priority and mail server.**
4. **Save the changes and wait for DNS propagation.**

### Verifying MX Records
You can verify MX records using tools like `nslookup` or online DNS checkers.
#### Using `nslookup`
```
nslookup -query=mx example.com
```
This will display the MX records for `example.com`.

### Common Issues
- **Incorrect priority values:** Ensure that priority values are integers and the lower values have higher priority.
- **Invalid mail server FQDN:** Verify that the FQDN is correct and points to an A or AAAA record.
- **TTL settings:** Ensure the TTL value is appropriate for your needs and not set too low.

By correctly configuring your MX records, you can ensure reliable email delivery for your domain.

## SPF
SPF (Sender Policy Framework) is an email authentication method designed to detect forging sender addresses during the delivery of emails. By specifying which mail servers are permitted to send emails on behalf of your domain, SPF helps reduce spam and phishing by making it harder for attackers to send emails with forged 'From' addresses.

### v (version)
Specifies the SPF version. It is mandatory and must be included.
```
v=spf1;
```
There are no other versions of SPF currently in use or specified.

### ip4 (IPv4 Address)
Specifies an IPv4 address that is authorized to send emails on behalf of the domain.
```
ip4:192.168.0.1;
```

### ip6 (IPv6 Address)
Specifies an IPv6 address that is authorized to send emails on behalf of the domain.
```
ip6:2001:0db8:85a3:0000:0000:8a2e:0370:7334;
```

### include
Includes the SPF records of another domain.
```
include:example.com;
```

### all
Specifies the default policy for any other IP addresses not matched by earlier mechanisms.
#### ~all (SoftFail)
Emails that do not match are marked, but still accepted.
```
~all;
```
#### -all (Fail)
Emails that do not match are rejected.
```
-all;
```
#### ?all (Neutral)
No specific action is taken for emails that do not match.
```
?all;
```
