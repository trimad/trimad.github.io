Import-Module ExchangeOnlineManagement -ErrorAction Stop
Connect-ExchangeOnline -ErrorAction Stop

$Mailbox = "mailbox@domain.com"

$StartDate = (Get-Date).AddDays(-7)
$EndDate   = Get-Date

$ExportPath = Join-Path $PSScriptRoot "$Mailbox-$($StartDate.ToString('yyyy-MM-dd'))-$($EndDate.ToString('yyyy-MM-dd')).csv"

$SessionId = "BackgroundchecksMailboxAudit_$([guid]::NewGuid().ToString())"

$AllResults = @()

do {
    Write-Host "Searching audit log batch... Current count: $($AllResults.Count)"

    $Batch = Search-UnifiedAuditLog `
        -StartDate $StartDate `
        -EndDate $EndDate `
        -ObjectIds $Mailbox `
        -SessionId $SessionId `
        -SessionCommand ReturnLargeSet `
        -ResultSize 5000

    if ($Batch) {
        $AllResults += $Batch
    }

} while ($Batch.Count -gt 0)

$ParsedResults = $AllResults | ForEach-Object {
    $AuditData = $_.AuditData | ConvertFrom-Json

    $Parameters = if ($AuditData.Parameters) {
        ($AuditData.Parameters | ForEach-Object {
            "$($_.Name)=$($_.Value)"
        }) -join "; "
    } else {
        ""
    }

    [PSCustomObject]@{
        Time            = $_.CreationDate
        Operation       = $_.Operations
        Actor           = $_.UserIds
        Workload        = $AuditData.Workload
        RecordType      = $AuditData.RecordType
        ObjectId        = $AuditData.ObjectId
        MailboxOwnerUPN = $AuditData.MailboxOwnerUPN
        MailboxGuid     = $AuditData.MailboxGuid
        ClientIP        = $AuditData.ClientIP
        UserAgent       = $AuditData.UserAgent
        LogonType       = $AuditData.LogonType
        ResultStatus    = $AuditData.ResultStatus
        Parameters      = $Parameters
        RawAuditData    = $_.AuditData
    }
}

$ParsedResults |
    Sort-Object Time |
    Export-Csv $ExportPath -NoTypeInformation

Write-Host "Export complete: $ExportPath"
Write-Host "Results found: $($ParsedResults.Count)"
