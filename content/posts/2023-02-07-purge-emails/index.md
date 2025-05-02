---
author: Tristan Madden
categories: [PowerShell]
date: 2023-02-07
featured: true
lastmod: 2023-12-28
tags: [email security, hacked accounts, M365, ExchangeOnlineManagement]
title: Handling Hacked Accounts and Purging Emails in M365
summary: This blog post is an evolving work flow for managing hacked accounts using the ExchangeOnlineManagement PowerShell module. I'll share my personal experiences using PowerShell, particularly focusing on remediation techniques like purging phishing emails and securing compromised accounts.
usePageBundles: true
thumbnail: "security_thumbnail.png"
toc: true
---

## Block Unwanted Emails

**Objective:** Prevent sending or receiving emails from specific external email addresses or domains.

**Action:** Navigate to the Tenant Allow/Block List in the Microsoft Security Center. Configure the settings to block specific email addresses or domains. For direct access, use this link: [Tenant Allow/Block List](https://security.microsoft.com/tenantAllowBlockList).

## Review Past Week of Sign-In History

**Objective:** Review sign-in history to identify any unusual user activity.

**Action:** Access the Azure portal's sign-in history section. Specify the user of interest and examine their sign-in locations and activities. Access the portal here: [Azure Sign-In History](https://portal.azure.com/#view/Microsoft_AAD_UsersAndTenants/UserManagementMenuBlade/~/SignIns).

## Define Content Search Criteria

**Objective:** Search and identify specific emails that need to be removed from your organization.

**Action:** Utilize the Content Search feature in the Microsoft Compliance center. Define your search criteria to target specific emails. Access Content Search here: [Content Search in Compliance Center](https://compliance.microsoft.com/contentsearchv2?viewid=search).

## Connect to Exchange Online Management

**Preparation:** The following steps require PowerShell. Ensure you launch `powershell_ise` with administrative privileges.

**Action:** Establish a connection to Exchange Online Management using an elevated PowerShell session.

```PowerShell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned # If not already set.
Install-Module -Name ExchangeOnlineManagement # If not installed.
Import-Module ExchangeOnlineManagement # This is a necessary step.
Connect-IPPSSession # Launches a Modern Authentication Window.
```

## Purge Unwanted Content

**Confirmation:** Ensure that your content search in the Compliance Center is valid. If the search name isn't visible, it might still be processing.

```PowerShell
Get-ComplianceSearch | Sort-Object JobEndTime # Retrieve and sort all compliance searches by job end time.
# or
Get-ComplianceSearch -Identity "05297487" | Select-Object * # Retrieveall stats of only one content search that you know the name of.
```

**Action:** Execute a "hard delete" on the identified content based on your search.

```PowerShell
New-ComplianceSearchAction -SearchName "name_of_content_search" -Purge -PurgeType HardDelete # Perform a hard delete of the search results.
```

**Status Check:** Monitor the progress of the hard delete operation. The names of purge actions are typically appended with `_Purge`.

```PowerShell
Get-ComplianceSearchAction -Identity "name_of_content_search_Purge" | Format-List # Check the status of the purge operation.
```

**Disconnect:** End your session with Exchange Online Management.

```PowerShell
Disconnect-ExchangeOnline # Disconnect from Exchange Online Management.
```

## Check Inbox Rules

**Objective:** Review and analyze inbox rules for each user to detect any unusual or unauthorized rules.

**Action:** Run the following PowerShell script to extract inbox rules for a list of specified user email addresses.

```powershell
Import-Module ExchangeOnlineManagement
Connect-ExchangeOnline # Launches a Modern Authentication Window.

# Define an array of user email addresses
$userEmails = @(
    'example-one@contoso.com',
    'example-two@contoso.com',
    'example-three@contoso.com'
)
 
# Iterate through each user and retrieve their inbox rules
foreach ($userEmail in $userEmails) {
    Write-Host ("Getting inbox rules for: " + $userEmail)
    # Attempt to fetch inbox rules for each user
    try {
        $inboxRules = Get-InboxRule -Mailbox $userEmail
        if ($inboxRules) {
            Write-Host ("Inbox rules for " + $userEmail + ":")
            $inboxRules | Format-List *  # Display all properties of the inbox rules
        } else {
            Write-Host ("No inbox rules found for " + $userEmail + ".")
        }
    } catch {
        Write-Host ("Error retrieving inbox rules for " + $userEmail + ": " + $_.Exception.Message)
    }
}

```