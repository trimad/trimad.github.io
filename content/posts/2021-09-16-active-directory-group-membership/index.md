---
title: Get Group Membership
author: Tristan Madden
categories: [PowerShell]
tags: [active directory, azure, domain, reports, group]
date: 2021-09-16
lastmod: 2023-05-19
thumbnail: "thumbnail.png"
usePageBundles: true
toc: true
---

Scripts useful for getting group membership. Run them from an admin-elevated Windows PowerShell ISE script pane. 

## ActiveDirectory

```PowerShell
# Import the Active Directory PowerShell module to provide cmdlets for AD operations
Import-Module ActiveDirectory

# Get all Active Directory groups, sorted by name. The -filter * returns all groups.
$groups = (Get-ADGroup -filter * | Sort Name)

# Store the total number of groups for progress tracking
$totalgroups = $groups.Count

# Initialize a counter for tracking the current group number
$i = 1

# Initialize an empty array to hold the output data
$output = @()

# Loop through each group
foreach ($group in $groups) {
    # Increment the counter
    $i++
    # Display the current processing progress in the console
    Write-Progress -activity "Processing $($group.Name)" -status "$i out of $totalgroups groups"

    # Get the members of the current group
    $groupMembers = Get-ADGroupMember -Identity $group

    # Loop through each member of the current group
    foreach ($member in $groupMembers) {
        # Create a new PSObject to hold the details
        $object = new-object PSObject

        # Add all properties of the group to the object
        $group.PSObject.Properties | foreach {
            $object | Add-Member -MemberType NoteProperty -Name ("Group_" + $_.Name) -Value $_.Value
        }

        # Add all properties of the member to the object
        $member.PSObject.Properties | foreach {
            $object | Add-Member -MemberType NoteProperty -Name ("Member_" + $_.Name) -Value $_.Value
        }

        # Add the object to the output array
        $output += $object
    }
    
    # Exit the loop early for debugging purposes after processing 10 groups
    if($i -eq 10){break;}
}

# Define the file path for the output CSV file at the root of the file system
$csvFilePath = "C:\output.csv"

# Export the data in the output array to a CSV file, omitting the type information
$output | Export-Csv $csvFilePath -NoTypeInformation

# Open the newly created CSV file in the default CSV file handler (typically Excel or a text editor)
Start-Process -FilePath $csvFilePath

```

## Connect-AzureAD

```PowerShell
# Connect to Azure Active Directory (Azure AD)
Connect-AzureAD

# Get all Azure AD groups
$groups = Get-AzureADGroup -All $true

# Initialize an empty array to hold the results
$resultsarray = @()

# Get the total number of groups for progress tracking
$totalgroups = $groups.Count

# Initialize a counter for the loop
$i = 0

# For each group in the array of groups
ForEach ($group in $groups){
    $i++

    # Display a progress bar in the console
    Write-Progress -activity "Processing $group.DisplayName" -status "$i out of $totalgroups groups"

    # Get all members of the current group
    $members = Get-AzureADGroupMember -ObjectId $group.ObjectId -All $true 

    # For each member in the array of members
    ForEach ($member in $members){
        # Create a new PSObject to hold the details
        $object = new-object PSObject

        # Add properties to the object for the group and member details
        $group.PSObject.Properties | ForEach-Object {
            $object | add-member -membertype NoteProperty -name ("Group " + $_.Name) -Value $_.Value
        }

        $member.PSObject.Properties | ForEach-Object {
            $object | add-member -membertype NoteProperty -name ("Member " + $_.Name) -Value $_.Value
        }

        # Add the object to the results array
        $resultsarray += $object
    }
    # Break after processing 10 groups for debugging. Remove or adjust this for actual run.
    if($i -eq 10){break;}
}

# Define the output path for the CSV file
$csvFilePath = "C:\output.csv"

# Export the results array to a CSV file, without type information
$resultsarray | Export-Csv $csvFilePath -NoTypeInformation

# Open the CSV file automatically with the default associated application
Start-Process -FilePath $csvFilePath

```