---
author: Tristan Madden
categories: [Windows, PowerShell, Active Directory, Exchange]
date: 2023-04-05
draft: false
summary: "A comprehensive guide to managing user visibility in the Global Address List (GAL) using PowerShell, covering both on-premises Active Directory and Exchange Online environments with detailed scripts for checking and modifying the msExchHideFromAddressLists attribute."
tags: [active-directory, exchange, powershell, gal, system-administration, office-365, exchange-online, user-management, directory-services]
title: "Managing Global Address List (GAL) Visibility with PowerShell"
toc: true
usePageBundles: true
---

## From ActiveDirectory

### Contacts

1. Retrieves a sorted list of contacts in the Active Directory by filtering objects with the "contact" objectClass.
2. Iterates through each contact, obtaining their DistinguishedName and the 'msExchHideFromAddressLists' property value.
3. Outputs a message indicating whether the 'msExchHideFromAddressLists' attribute is present for each contact and whether the contact is hidden from address lists.

```PowerShell
Import-Module ActiveDirectory

$contacts = Get-ADObject -Filter {objectClass -eq "contact"} | sort

foreach ($contact in $contacts) {
    $contactDN = $contact.DistinguishedName
    $hideFromAddressLists = (Get-ADObject -Identity $contactDN -Properties msExchHideFromAddressLists).msExchHideFromAddressLists
    if ([string]::IsNullOrEmpty($hideFromAddressLists)) {
        Write-Host "Contact $($contact.name) does not have the 'msExchHideFromAddressLists' attribute"
    } else {
        Write-Host "Contact $($contact.name) is hidden from address lists: $($hideFromAddressLists)"
    }
}
```

1. Retrieves the distinguished name of the "external users" distribution list in Active Directory.
2. Obtains a sorted list of contacts that belong to the "external users" distribution list.
3. Iterates through each contact and sets the 'msExchHideFromAddressLists' attribute to 'True', effectively hiding them from address lists.

```PowerShell
Import-Module ActiveDirectory

# Get the distinguished name of the "external users" distribution list
$externalUsersDL = (Get-ADGroup -Filter {name -eq "external users"}).DistinguishedName
 
# Get all contacts that belong to the "external users" distribution list
$contacts = Get-ADObject -Filter {objectClass -eq "contact" -and memberOf -eq $externalUsersDL} | sort
 
foreach ($contact in $contacts) {
    $contactDN = $contact.DistinguishedName
    $hideFromAddressLists = (Get-ADObject -Identity $contactDN -Properties Set-ADObject -Identity $contactDN -Replace @{msExchHideFromAddressLists=$true}
}
```

### Users

1. Retrieves a list of users from the "DisabledUsers" organizational unit (OU) in Active Directory, including their 'msExchHideFromAddressLists' property.
2. Iterates through each user in the list and checks the value of their 'msExchHideFromAddressLists' property.
3. Outputs a message for each user, indicating whether they have the 'msExchHideFromAddressLists' attribute set and, if so, whether they are hidden from address lists.

```PowerShell
Import-Module ActiveDirectory

$disabledUsersOU = "OU=DisabledUsers,OU=,DC=,DC="
$users = Get-ADUser -SearchBase $disabledUsersOU -Filter * -Properties msExchHideFromAddressLists

foreach ($user in $users) {
    $userDN = $user.DistinguishedName
    $hideFromAddressLists = $user.msExchHideFromAddressLists
    if ([string]::IsNullOrEmpty($hideFromAddressLists)) {
        Write-Host "User $($user.name) does not have the 'msExchHideFromAddressLists' attribute"
    } else {
        Write-Host "User $($user.name) is hidden from address lists: $($hideFromAddressLists)"
    }
}

```


1. Retrieves and sorts users from the "DisabledUsers" OU in Active Directory, including their 'msExchHideFromAddressLists' property.
2. Iterates through each user, evaluating the value of their 'msExchHideFromAddressLists' property.
3. Sets or updates the 'msExchHideFromAddressLists' attribute to 'True' for users who don't have it set or have it set to 'False', and outputs corresponding messages; for users with the attribute already set to 'True', the script outputs an informative message.

```PowerShell
Import-Module ActiveDirectory
 
$disabledUsersOU = "OU=DisabledUsers,OU= Sites,DC=,DC="
$users = Get-ADUser -SearchBase $disabledUsersOU -Filter * -Properties msExchHideFromAddressLists | sort
 
foreach ($user in $users) {
    $userDN = $user.DistinguishedName
    $hideFromAddressLists = $user.msExchHideFromAddressLists
    if ([string]::IsNullOrEmpty($hideFromAddressLists)) {
        Set-ADUser -Identity $userDN -Add @{msExchHideFromAddressLists=$true}
        Write-Host "User $($user.name) did not have the 'msExchHideFromAddressLists' attribute and it has been set to 'True'"
    } elseif (!$hideFromAddressLists) {
        Set-ADUser -Identity $userDN -Replace @{msExchHideFromAddressLists=$true}
        Write-Host "User $($user.name) had the 'msExchHideFromAddressLists' attribute set to 'False' and it has been set to 'True'"
    } else {
        Write-Host "User $($user.name) already has the 'msExchHideFromAddressLists' attribute set to 'True'"
    }
}
```

## From ExchangeOnlineManagement

### Contacts

1. Retrieves members of the "External Users" distribution group using the Get-DistributionGroupMember cmdlet.
2. Iterates through each member, retrieves their Name and HiddenFromAddressListsEnabled properties using the Get-MailContact cmdlet, and outputs this information.
3. Updates the HiddenFromAddressListsEnabled property of each member to 'True' using the Set-MailContact cmdlet.

```PowerShell
Install-Module -Name ExchangeOnlineManagement # if not installed already
Import-Module ExchangeOnlineManagement
Connect-ExchangeOnline
 
$ExternalUsers = Get-DistributionGroupMember -Identity "External Users"
foreach ($user in $ExternalUsers) {
    $mailContact = Get-MailContact -Identity $user.Name | Select-Object Name, HiddenFromAddressListsEnabled
    Write-Host "Name: $($mailContact.Name), HiddenFromAddressListsEnabled: $($mailContact.HiddenFromAddressListsEnabled)"
    
    # Set HiddenFromAddressListsEnabled to True
    Set-MailContact -Identity $user.Name -HiddenFromAddressListsEnabled $true
}
```