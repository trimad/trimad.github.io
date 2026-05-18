param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateNotNullOrEmpty()]
    [string]$Mailbox
)

Import-Module ExchangeOnlineManagement -ErrorAction Stop

Connect-ExchangeOnline -ErrorAction Stop

$StartDate = (Get-Date).AddDays(-90)
$EndDate   = Get-Date

$SafeMailboxName = $Mailbox -replace '[^a-zA-Z0-9._-]', '_'
$ExportPath = Join-Path $PSScriptRoot "$SafeMailboxName-AllOperationsPerformedTo-Last90Days.csv"

$SessionId = "AuditSearch_$([guid]::NewGuid().ToString())"

$AllResults = @()

do {
    Write-Host "Searching audit log batch... Current count: $($AllResults.Count)"

    $Batch = Search-UnifiedAuditLog `
        -StartDate $StartDate `
        -EndDate $EndDate `
        -ObjectIds $Mailbox `
        -SessionId $SessionId `
        -SessionCommand ReturnLargeSet `
        -ResultSize 5000 `
        -ErrorAction Stop

    if ($Batch) {
        $AllResults += $Batch
    }

} while ($Batch.Count -eq 5000)

$ParsedResults = $AllResults | ForEach-Object {
    $AuditData = $_.AuditData | ConvertFrom-Json

    [PSCustomObject]@{
        CreationDate = $_.CreationDate
        Operation    = $_.Operations
        UserIds      = $_.UserIds
        ObjectId     = $AuditData.ObjectId
        Workload     = $_.Workload
        ResultStatus = $_.ResultStatus
        AuditData    = $_.AuditData
    }
}

$ParsedResults |
    Sort-Object CreationDate |
    Export-Csv -Path $ExportPath -NoTypeInformation -Encoding UTF8

Write-Host "Export complete: $ExportPath"
Write-Host "Results found: $($ParsedResults.Count)"
