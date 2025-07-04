---
author: Tristan Madden
categories: [PowerShell]
date: 2025-07-02
draft: false
tags: [SMTP]
title: SMTP Test With PowerShell
summary: "Test Microsoft365 credentials for SMTP scan using TLS 1.2"
usePageBundles: true
---

### SMTP Test Script for Microsoft 365

This post documents a simple PowerShell script to verify SMTP connectivity against Microsoft 365 (Office 365) using TLS 1.2. It’s useful for troubleshooting mail flow issues or confirming that SMTP AUTH is properly enabled on your tenant and mailbox.

### Prerequisites

- A Microsoft 365 (Office 365) mailbox with **SMTP AUTH** enabled  
- PowerShell 5.1 or later (built-in on Windows 10/11)  
- Network connectivity to `smtp.office365.com` on port 587  

> **Note:** If your tenant has SMTP AUTH disabled globally, you’ll need to enable it either per-user or at the organization level in the Exchange admin center.

### Script Walkthrough

```powershell
# Force TLS 1.2 for secure connections
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
 
$smtpServer = "smtp.office365.com"
$smtpPort = 587
$fromAddress = "user@domain.com"
$toAddress = "user@domain.com"
$subject = "SMTP Test Email"
$body = "This is a test email sent from PowerShell SMTP test script using Microsoft 365."
$username = "user@domain.com"
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