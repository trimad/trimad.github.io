---
author: Tristan Madden
categories: [PowerShell]
date: 2025-07-02
draft: false
tags: [smtp, spoofing, email]
title: Test SMTP
summary: "PowerShell scripts for testing SMTP, with and without authentication."
usePageBundles: true
toc: true
---

## Outlook SMTP Test with STARTTLS and TLS 1.2

### Prerequisites

*-* A licensed Microsoft 365 mailbox with Exchange Online.

*-* **SMTP AUTH** must be enabled. If your tenant has SMTP AUTH disabled globally, you’ll need to enable it either per-user or at the organization level in the Exchange admin center.

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

## Spoof Outlook Emails

### Prerequisites
*-* The $toAddress should be an Outlook recipient whose domain is not protected by DMARC.

### Script
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

## Spoof GSuite Emails

### Prerequisites
*-* The $toAddress should be a GSuite recipient whose domain is not protected by DMARC.

### - Script
```powershell
$smtpServer = "aspmx.l.google.com"
$smtpPort = 25
$fromAddress = "fromuser@domain.com"
$toAddress = "touser@domain.com"
$subject = "SMTP Test Email"
$body = "This is a test email, sent via a PowerShell script."

$messageID = "<" + [System.Guid]::NewGuid().ToString() + "@darbycreekcounseling.org>"
$dateHeader = [DateTime]::Now.ToString("R")

$message = New-Object System.Net.Mail.MailMessage
$message.From = $fromAddress
$message.To.Add($toAddress)
$message.Subject = $subject
$message.Body = $body
$message.Headers.Add("Message-ID", $messageID)
$message.Headers.Add("Date", $dateHeader)

$smtp = New-Object System.Net.Mail.SmtpClient($smtpServer, $smtpPort)
try {
    Write-Output "Spoofing GSuite email..."
    $smtp.Send($message)
    Write-Output "Email spoofed successfully."
} catch {
    Write-Output "Failed to spoof email. Error: $_"
}
```

