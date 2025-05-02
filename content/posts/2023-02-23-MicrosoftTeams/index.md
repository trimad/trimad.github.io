---
author: Tristan Madden
categories: [PowerShell]
date: 2023-02-23
tags: [microsoft teams]
title: MicrosoftTeams PowerShell module
thumbnail: "thumbnail.png"
summary: PowerShell scripts for Microsoft Teams stuff.
usePageBundles: true
---

PowerShell scripts for Microsoft Teams stuff.

<h3>Get all owners of all teams and team channels</h3>

```PowerShell
## Documentation: https://learn.microsoft.com/en-us/powershell/module/teams/?view=teams-ps
 
# Run the following command to install the latest PowerShellGet:
Install-Module -Name PowerShellGet -Force -AllowClobber
 
# Install the Teams PowerShell Module.
Install-Module -Name MicrosoftTeams -Force -AllowClobber
 
# To start working with Microsoft Teams PowerShell module, sign in with your Azure credentials.
Connect-MicrosoftTeams
 
$user =Read-Host -Prompt 'Input the user name'
$teams = Get-Team -User $user
$teamMemberships=@()
$teamChannels=@()
$teamChannelMemberships=@()
 
$i = 1

$teamMemberships = foreach ($team in $teams) {
    $GroupId = $team.GroupId   
    
    Get-TeamUser -GroupId $GroupId | Select-Object *,@{Name="GroupId";Expression={$GroupId}}
    $channels = Get-TeamAllChannel -GroupId $GroupId | Select-Object *,@{Name="GroupId";Expression={$GroupId}}
    $teamChannels += $channels

    $teamChannelMemberships += foreach ($channel in $channels) {
        $channelDisplayName = $channel.DisplayName
        Get-TeamChannelUser -GroupId $GroupId -DisplayName $channelDisplayName | Select-Object *,@{Name="GroupId";Expression={$GroupId}}
    }

    $percent = [Math]::Round((100 * $i) / $teams.Length)
    Write-Progress -Activity "Search in Progress" -Status "$percent% complete"
    $i++
    }

$teams | Export-Csv -Path "teams.csv" -NoTypeInformation
$teamMemberships | Export-Csv -Path "team-memberships.csv" -NoTypeInformation
$teamChannels | Export-Csv -Path "team-channels.csv" -NoTypeInformation
$teamChannelMemberShips | Export-Csv -Path "team-channel-memberships.csv" -NoTypeInformation
```