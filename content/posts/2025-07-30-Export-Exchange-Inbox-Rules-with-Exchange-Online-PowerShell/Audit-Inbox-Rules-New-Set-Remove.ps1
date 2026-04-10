<#
.SYNOPSIS
Retrieves raw inbox rule audit events for a single mailbox and exports them to JSON.

.DESCRIPTION
Installs/imports the ExchangeOnlineManagement module if needed, connects to
Exchange Online PowerShell, verifies that Search-UnifiedAuditLog is available,
and exports the raw inbox rule audit activity for the specified mailbox between
the selected start and end dates to a single JSON file.

.NOTES
Recommended: rename this file to something generic such as
Get-InboxRuleAuditReport.ps1 once you are ready to standardize it.
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$AdminUpn,

    [Parameter()]
    [string]$TargetMailbox = 'user@contoso.com',

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

function ConvertTo-SafeFileNameSegment {
    param(
        [string]$Value,

        [string]$Fallback = 'Report'
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $Fallback
    }

    return ($Value -replace '[^a-zA-Z0-9@._-]', '_')
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
        [string]$QueriedMailbox
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
        RawAuditDataJson = $rawAuditData
    }
}

try {
    if ([string]::IsNullOrWhiteSpace($TargetMailbox)) {
        throw "TargetMailbox must be specified."
    }

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

    $events = @(Get-UnifiedAuditLogResults -Start $StartDate -End $EndDate -Mailbox $TargetMailbox -AuditOperations $Operations)

    if ($events.Count -eq 0) {
        Write-Warning "No inbox rule audit events were returned for $TargetMailbox between $StartDate and $EndDate."
        return
    }

    $rawAuditObjects = @(
        $events |
            ForEach-Object { ConvertTo-RawAuditObject -Event $_ -QueriedMailbox $TargetMailbox } |
            Where-Object { $null -ne $_ }
    )

    $safeMailboxName = ConvertTo-SafeFileNameSegment -Value $TargetMailbox -Fallback 'Mailbox'
    $allJson = Join-Path $OutputDirectory "$safeMailboxName.json"
    $rawAuditObjects |
        ConvertTo-Json -Depth 10 |
        Out-File -FilePath $allJson -Encoding utf8

    Write-Host ""
    Write-Host "Raw audit export: $allJson" -ForegroundColor Green
    Write-Host ("Exported {0} raw inbox rule audit events." -f $rawAuditObjects.Count) -ForegroundColor Green
}
finally {
    Disconnect-ComplianceSession
}
