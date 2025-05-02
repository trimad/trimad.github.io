---
author: Tristan Madden
categories: [shell, powershell]
date: 2023-06-24
lastmod: 2023-07-21
featured: false
summary: "This post presents one-liner commands using Shell and PowerShell to add a workstation to Active Directory."
tags: [ai, images, video]
thumbnail: "thumbnail.png"
title: Join a Workstation to Active Directory with Shell and PowerShell
toc: true
usePageBundles: true
---

In this blog post, we will showcase concise and efficient commands that you can use in both Shell and PowerShell to join a workstation to Active Directory. These one-liner commands are practical for both quick use cases and scripting.

## Shell

The following one-liner in Shell can join a workstation to Active Directory. It first invokes PowerShell to utilize its more sophisticated handling of secure credentials.

```shell
powershell -Command "& {$password = ConvertTo-SecureString 'thepassword' -AsPlainText -Force; $credential = New-Object System.Management.Automation.PSCredential ('domain\username', $password); Add-Computer -DomainName 'thedomainname' -Credential $credential -Restart -Force}"
```

In this command, replace 'thepassword', 'domain\username', and 'thedomainname' with the actual password, domain username, and domain name, respectively. After execution, the workstation will be forced to restart to apply the changes.

## PowerShell

You can also use PowerShell directly to achieve the same result. The following command is similar to the Shell command but is run natively in PowerShell:

```PowerShell
& {$password = ConvertTo-SecureString 'thepassword' -AsPlainText -Force; $credential = New-Object System.Management.Automation.PSCredential ('domain\username', $password); Add-Computer -DomainName 'thedomainname' -Credential $credential -Restart -Force}
```
Like with the Shell command, you need to replace 'thepassword', 'domain\username', and 'thedomainname' with the actual password, domain username, and domain name, respectively. The workstation will restart after this command is executed.

{{% notice warning "WARNING" %}}
Remember, while these one-liner commands are convenient, they also involve handling sensitive information such as usernames and passwords in plain text. Ensure to run these commands in a secure environment, and do not leave the sensitive information in your scripts or command history.
{{% /notice %}}