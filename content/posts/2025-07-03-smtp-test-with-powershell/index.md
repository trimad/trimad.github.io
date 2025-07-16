---
author: Tristan Madden
categories: [PowerShell]
date: 2025-07-02
draft: false
tags: [SMTP]
title: Test SMTP
summary: "PowerShell scripts for testing SMTP, with and without authentication."
usePageBundles: true
toc: true
---

## SMTP Test with STARTTLS and TLS 1.2

This post documents a simple PowerShell script to verify SMTP connectivity against Microsoft 365 (Office 365) using TLS 1.2. It’s useful for troubleshooting mail flow issues or confirming that SMTP AUTH is properly enabled on your tenant and mailbox.

### - Prerequisites

- A Microsoft 365 (Office 365) mailbox with **SMTP AUTH** enabled
- The Microsoft 365 mailbox must be licensed.

> **Note:** If your tenant has SMTP AUTH disabled globally, you’ll need to enable it either per-user or at the organization level in the Exchange admin center.

### - Script

```powershell
# Force TLS 1.2 for secure connections
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
 
$smtpServer = "smtp.office365.com"
$smtpPort = 587
$fromAddress = "fromuser@domain.com"
$toAddress = "touser@domain.com"
$subject = "SMTP Test Email"
$body = "This is a test email, sent via a PowerShell script."
$username = "fromuser@domain.com"
$password = ""
 
$securePassword = ConvertTo-SecureString $password -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential ($username, $securePassword)
 
try {
    Write-Output "Attempting to send email with Send-MailMessage using TLS 1.2..."
    Send-MailMessage -From $fromAddress -To $toAddress -Subject $subject -Body $body `
        -SmtpServer $smtpServer -Port $smtpPort -UseSsl -Credential $credential -ErrorAction Stop
    Write-Output "SMTP test email sent successfully."
} catch {
    Write-Output "Failed to send SMTP test email. Error: $_"
}
```

## SMTP Test with no authentication

### - Prerequisites
- The public IP address of the organization must be added to the SPF record of the domain.
- The script must be run from behind the same public IP address in the SPF record.
- The $smtpServer variable does not use `smtp.office365.com` because this script does not use authentication.

### - Script
```powershell
$smtpServer = "domain-com.mail.protection.outlook.com"
$smtpPort = 25
$fromAddress = "fromuser@domain.com"
$toAddress = "touser@domain.com"
$subject = "SMTP Test Email"
$body = "This is a test email, sent via a PowerShell script."

try {
    Write-Output "Attempting to send email with Send-MailMessage on port 25 without authentication or STARTTLS..."
    Send-MailMessage -From $fromAddress -To $toAddress -Subject $subject -Body $body `
        -SmtpServer $smtpServer -Port $smtpPort -ErrorAction Stop
    Write-Output "SMTP test email sent successfully."
} catch {
    Write-Output "Failed to send SMTP test email. Error: $_"
}
```