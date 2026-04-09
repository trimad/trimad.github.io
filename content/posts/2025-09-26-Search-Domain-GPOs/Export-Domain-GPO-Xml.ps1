Import-Module GroupPolicy

# Output folder for all XML reports
$ExportPath = "C:\Temp\GPO_XML_Exports"

# Create folder if it does not exist
if (-not (Test-Path -Path $ExportPath)) {
    New-Item -Path $ExportPath -ItemType Directory -Force | Out-Null
}

# Get all GPOs in the current domain
$AllGPOs = Get-GPO -All

Write-Host "Exporting $($AllGPOs.Count) GPO(s) to XML..." -ForegroundColor Cyan

foreach ($GPO in $AllGPOs) {
    try {
        # Sanitize display name for filename safety
        $SafeName = $GPO.DisplayName -replace '[\\/:*?"<>|]', '_'

        # Build output file path
        $ReportPath = Join-Path $ExportPath "$SafeName - $($GPO.Id).xml"

        # Export GPO report as XML
        Get-GPOReport -Guid $GPO.Id -ReportType Xml -Path $ReportPath -ErrorAction Stop

        Write-Host "Exported: $($GPO.DisplayName)" -ForegroundColor Green
    }
    catch {
        Write-Warning "Failed to export GPO: $($GPO.DisplayName) (ID: $($GPO.Id)) - $($_.Exception.Message)"
    }
}

Write-Host "Done. XML reports saved to: $ExportPath" -ForegroundColor Cyan
