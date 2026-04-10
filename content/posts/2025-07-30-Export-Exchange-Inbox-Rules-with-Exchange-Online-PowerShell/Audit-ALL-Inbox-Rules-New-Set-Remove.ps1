<#
.SYNOPSIS
Retrieves inbox rule audit events for all mailboxes in all accepted domains.

.DESCRIPTION
Installs/imports the ExchangeOnlineManagement module if needed, connects to
Exchange Online PowerShell, verifies that Search-UnifiedAuditLog is available,
enumerates accepted domains, finds mailboxes whose primary SMTP addresses match
 those domains, and exports combined inbox rule audit activity for all matched
mailboxes between the selected start and end dates.

.NOTES
Output:
- AcceptedDomainInboxRuleAudit.json
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$AdminUpn,

    [Parameter()]
    [datetime]$StartDate = (Get-Date).Date.AddDays(-90),

    [Parameter()]
    [datetime]$EndDate = (Get-Date),

    [Parameter()]
    [string[]]$Operations = @('New-InboxRule', 'Set-InboxRule', 'Remove-InboxRule'),

    [Parameter()]
    [string]$OutputDirectory = (Get-Location).Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Ensure-ExchangeOnlineManagementModule {
    if (-not (Get-Module -ListAvailable -Name ExchangeOnlineManagement)) {
        Write-Host "ExchangeOnlineManagement module not found. Installing for current user..." -ForegroundColor Yellow
        Install-Module -Name ExchangeOnlineManagement -Scope CurrentUser -Force -AllowClobber
    }

    Import-Module ExchangeOnlineManagement -ErrorAction Stop
}

function Connect-ComplianceSession {
    param(
        [string]$UserPrincipalName
    )

    Write-Host "Connecting to Exchange Online PowerShell..." -ForegroundColor Yellow

    if ([string]::IsNullOrWhiteSpace($UserPrincipalName)) {
        Connect-ExchangeOnline -ShowBanner:$false
    }
    else {
        Connect-ExchangeOnline -UserPrincipalName $UserPrincipalName -ShowBanner:$false
    }

    if (-not (Get-Command -Name Search-UnifiedAuditLog -ErrorAction SilentlyContinue)) {
        Write-Host "Search-UnifiedAuditLog is not available after Exchange Online sign-in. Trying Security & Compliance search session..." -ForegroundColor Yellow

        if ([string]::IsNullOrWhiteSpace($UserPrincipalName)) {
            Connect-IPPSSession -EnableSearchOnlySession
        }
        else {
            Connect-IPPSSession -UserPrincipalName $UserPrincipalName -EnableSearchOnlySession
        }
    }

    if (-not (Get-Command -Name Search-UnifiedAuditLog -ErrorAction SilentlyContinue)) {
        $moduleVersion = (Get-Module ExchangeOnlineManagement -ListAvailable | Sort-Object Version -Descending | Select-Object -First 1 -ExpandProperty Version)
        throw "Search-UnifiedAuditLog is still unavailable after authentication. Verify that your account has the 'View-Only Audit Logs' or 'Audit Logs' role, and that ExchangeOnlineManagement is current. Installed module version detected: $moduleVersion"
    }

    Write-Host "Connected and Search-UnifiedAuditLog is available." -ForegroundColor Green
}

function Disconnect-ComplianceSession {
    try {
        Disconnect-ExchangeOnline -Confirm:$false -ErrorAction SilentlyContinue | Out-Null
    }
    catch {
        Write-Warning "Disconnect failed: $($_.Exception.Message)"
    }
}

function Get-OptionalPropertyValue {
    param(
        [Parameter(Mandatory)]
        $InputObject,

        [Parameter(Mandatory)]
        [string[]]$PropertyNames
    )

    if ($null -eq $InputObject) {
        return $null
    }

    foreach ($propertyName in $PropertyNames) {
        $property = $InputObject.PSObject.Properties[$propertyName]
        if ($null -ne $property) {
            return $property.Value
        }
    }

    return $null
}

function Get-MailboxDomain {
    param(
        [Parameter(Mandatory)]
        [string]$SmtpAddress
    )

    if ($SmtpAddress -match '@(.+)$') {
        return $Matches[1].ToLowerInvariant()
    }

    return $null
}

function Get-UnifiedAuditLogResults {
    param(
        [datetime]$Start,
        [datetime]$End,
        [string]$Mailbox,
        [string[]]$AuditOperations
    )

    $sessionId = "InboxRuleAudit-$([guid]::NewGuid())"
    $allResults = New-Object System.Collections.Generic.List[object]
    $page = 1

    do {
        Write-Host ("Fetching audit page {0} for {1}..." -f $page, $Mailbox) -ForegroundColor Cyan

        # Search-UnifiedAuditLog may return $null, a single object, or an array.
        $batch = @(Search-UnifiedAuditLog `
            -StartDate $Start `
            -EndDate $End `
            -Operations $AuditOperations `
            -UserIds $Mailbox `
            -SessionId $sessionId `
            -SessionCommand ReturnLargeSet `
            -ResultSize 5000)

        if ($batch) {
            foreach ($item in $batch) {
                [void]$allResults.Add($item)
            }
        }

        $page++
    }
    while ($batch.Count -gt 0)

    return @($allResults | Sort-Object Identity -Unique)
}

function ConvertTo-RawAuditObject {
    param(
        [Parameter(Mandatory)]
        $Event,

        [Parameter(Mandatory)]
        [string]$QueriedMailbox,

        [Parameter(Mandatory)]
        [string]$AcceptedDomain,

        [Parameter(Mandatory)]
        [string]$DisplayName
    )

    $rawAuditData = Get-OptionalPropertyValue -InputObject $Event -PropertyNames @('AuditData')

    $auditData = $null
    if (-not [string]::IsNullOrWhiteSpace($rawAuditData)) {
        try {
            $auditData = $rawAuditData | ConvertFrom-Json -ErrorAction Stop
        }
        catch {
            $auditData = $null
        }
    }

    if ($auditData) {
        return $auditData
    }

    return [PSCustomObject]@{
        QueriedMailbox   = $QueriedMailbox
        MailboxDisplayName = $DisplayName
        AcceptedDomain   = $AcceptedDomain
        RawAuditDataJson = $rawAuditData
    }
}

try {
    if ($StartDate -gt $EndDate) {
        throw "StartDate must be earlier than or equal to EndDate."
    }

    if ($Operations.Count -eq 0) {
        throw "At least one audit operation must be specified."
    }

    if (-not (Test-Path -LiteralPath $OutputDirectory)) {
        New-Item -ItemType Directory -Path $OutputDirectory | Out-Null
    }

    Ensure-ExchangeOnlineManagementModule
    Connect-ComplianceSession -UserPrincipalName $AdminUpn

    Write-Host "Retrieving accepted domains..." -ForegroundColor Yellow
    $acceptedDomains = @(
        Get-AcceptedDomain |
            Select-Object -ExpandProperty DomainName |
            ForEach-Object { ([string]$_).ToLowerInvariant() } |
            Sort-Object -Unique
    )

    if ($acceptedDomains.Count -eq 0) {
        throw "No accepted domains were returned."
    }

    Write-Host ("Found {0} accepted domains." -f $acceptedDomains.Count) -ForegroundColor Green
    $acceptedDomains | ForEach-Object { Write-Host (" - {0}" -f $_) -ForegroundColor DarkGray }

    Write-Host ""
    Write-Host "Enumerating mailboxes..." -ForegroundColor Yellow

    $mailboxes = @(
        Get-Mailbox -ResultSize Unlimited |
            Where-Object {
                $smtpAddress = [string]$_.PrimarySmtpAddress
                $mailboxDomain = Get-MailboxDomain -SmtpAddress $smtpAddress
                $mailboxDomain -and ($acceptedDomains -contains $mailboxDomain)
            } |
            Sort-Object PrimarySmtpAddress
    )

    if ($mailboxes.Count -eq 0) {
        throw "No mailboxes were found for the accepted domains."
    }

    Write-Host ("Found {0} mailboxes across {1} accepted domains." -f $mailboxes.Count, $acceptedDomains.Count) -ForegroundColor Green

    $allRawAuditObjects = New-Object System.Collections.Generic.List[object]
    $summaryRows = New-Object System.Collections.Generic.List[object]
    $counter = 1

    foreach ($mailbox in $mailboxes) {
        $primarySmtpAddress = [string]$mailbox.PrimarySmtpAddress
        $mailboxDomain = Get-MailboxDomain -SmtpAddress $primarySmtpAddress
        $displayName = [string]$mailbox.DisplayName

        Write-Host ""
        Write-Host ("[{0}/{1}] Auditing {2}..." -f $counter, $mailboxes.Count, $primarySmtpAddress) -ForegroundColor Yellow
        $counter++

        try {
            $events = @(Get-UnifiedAuditLogResults -Start $StartDate -End $EndDate -Mailbox $primarySmtpAddress -AuditOperations $Operations)

            if ($events.Count -eq 0) {
                [void]$summaryRows.Add([PSCustomObject]@{
                    QueriedMailbox     = $primarySmtpAddress
                    MailboxDisplayName = $displayName
                    AcceptedDomain     = $mailboxDomain
                    EventCount         = 0
                    Status             = 'NoEvents'
                    Error              = ''
                })

                continue
            }

            $rawAuditObjects = @(
                $events |
                    ForEach-Object {
                        ConvertTo-RawAuditObject `
                            -Event $_ `
                            -QueriedMailbox $primarySmtpAddress `
                            -AcceptedDomain $mailboxDomain `
                            -DisplayName $displayName
                    } |
                    Where-Object { $null -ne $_ }
            )

            foreach ($rawAuditObject in $rawAuditObjects) {
                [void]$allRawAuditObjects.Add($rawAuditObject)
            }

            [void]$summaryRows.Add([PSCustomObject]@{
                QueriedMailbox     = $primarySmtpAddress
                MailboxDisplayName = $displayName
                AcceptedDomain     = $mailboxDomain
                EventCount         = $rawAuditObjects.Count
                Status             = 'Success'
                Error              = ''
            })
        }
        catch {
            Write-Warning "Failed to retrieve inbox rule audit events for ${primarySmtpAddress}: $($_.Exception.Message)"

            [void]$summaryRows.Add([PSCustomObject]@{
                QueriedMailbox     = $primarySmtpAddress
                MailboxDisplayName = $displayName
                AcceptedDomain     = $mailboxDomain
                EventCount         = 0
                Status             = 'Failed'
                Error              = $_.Exception.Message
            })
        }
    }

    if ($allRawAuditObjects.Count -eq 0) {
        Write-Warning "No inbox rule audit events were found for any mailbox in the accepted domains."
        return
    }

    $allJson = Join-Path $OutputDirectory 'Audit-ALL-Inbox-Rules-New-Set-Remove.json'
    $allRawAuditObjects |
        ConvertTo-Json -Depth 10 |
        Out-File -FilePath $allJson -Encoding utf8

    Write-Host ""
    Write-Host "Combined audit export: $allJson" -ForegroundColor Green
    Write-Host ""
    Write-Host "Mailbox audit summary:" -ForegroundColor Cyan
    $summaryRows |
        Sort-Object QueriedMailbox |
        Format-Table QueriedMailbox, AcceptedDomain, EventCount, Status -AutoSize
}
finally {
    Disconnect-ComplianceSession
}
