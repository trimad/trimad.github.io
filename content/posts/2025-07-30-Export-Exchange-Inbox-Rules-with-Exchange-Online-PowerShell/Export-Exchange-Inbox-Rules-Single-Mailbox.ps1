<#
.SYNOPSIS
Collects inbox rules for a single mailbox and exports them to a formatted JSON file.

.DESCRIPTION
This script connects to Exchange Online and retrieves all inbox rules for a
specified mailbox, then exports the results to SingleMailboxInboxRules.json.
#>

Write-Host "`n=== Single Mailbox Inbox Rule Collector ===`n" -ForegroundColor Cyan

# --- STEP 1: Prompt for mailbox ---
$mailbox = Read-Host "Enter the mailbox (UPN or SMTP address)"

if (-not $mailbox) {
    Write-Host "[ERROR] No mailbox provided. Exiting." -ForegroundColor Red
    exit
}

# --- STEP 2: Connect to Exchange Online ---
try {
    Write-Host "Connecting to Exchange Online..." -ForegroundColor Yellow
    Connect-ExchangeOnline -ErrorAction Stop
    Write-Host "[OK] Connected successfully.`n" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to connect to Exchange Online: $_" -ForegroundColor Red
    exit
}

# --- STEP 3: Validate mailbox existence ---
try {
    $mbx = Get-Mailbox -Identity $mailbox -ErrorAction Stop
    Write-Host "Mailbox found: $($mbx.PrimarySmtpAddress)`n" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Mailbox not found or inaccessible: $_" -ForegroundColor Red
    Disconnect-ExchangeOnline -Confirm:$false
    exit
}

# --- STEP 4: Retrieve inbox rules ---
Write-Host "Retrieving inbox rules for $($mbx.PrimarySmtpAddress)...`n" -ForegroundColor Yellow

$rules = @()

try {
    $inboxRules = Get-InboxRule -Mailbox $mbx.PrimarySmtpAddress -ErrorAction Stop

    foreach ($rule in $inboxRules) {
        $rules += [PSCustomObject]@{
            Mailbox               = $mbx.PrimarySmtpAddress.ToString()
            Name                  = $rule.Name
            Enabled               = $rule.Enabled
            Priority              = $rule.Priority
            Description           = $rule.Description
            From                  = ($rule.From | ForEach-Object { $_.Address }) -join ', '
            FromAddressContains   = ($rule.FromAddressContainsWords -join ', ')
            SubjectContains       = ($rule.SubjectContainsWords -join ', ')
            SubjectOrBodyContains = ($rule.SubjectOrBodyContainsWords -join ', ')
            SentTo                = ($rule.SentTo | ForEach-Object { $_.Address }) -join ', '
            MoveToFolder          = $rule.MoveToFolder
            MarkAsRead            = $rule.MarkAsRead
            ForwardTo             = ($rule.ForwardTo | ForEach-Object { $_.Address }) -join ', '
            RedirectTo            = ($rule.RedirectTo | ForEach-Object { $_.Address }) -join ', '
            StopProcessingRules   = $rule.StopProcessingRules
        }
    }
} catch {
    Write-Host "[ERROR] Failed to retrieve inbox rules: $_" -ForegroundColor Red
}

# --- STEP 5: Export results to JSON ---
$outputFile = Join-Path (Get-Location) "SingleMailboxInboxRules.json"

if ($rules.Count -eq 0) {
    Write-Warning "No inbox rules found for this mailbox."
    "[]" | Out-File -FilePath $outputFile -Encoding utf8
} else {
    $rules | ConvertTo-Json -Depth 5 | Out-File -FilePath $outputFile -Encoding utf8
    Write-Host ("`n[OK] Exported {0} inbox rules to {1}" -f $rules.Count, $outputFile) -ForegroundColor Green
}

# --- STEP 6: Open the output file ---
Start-Process $outputFile

# --- STEP 7: Clean up session ---
Disconnect-ExchangeOnline -Confirm:$false
Write-Host "`nSession disconnected. All done!`n" -ForegroundColor Cyan
