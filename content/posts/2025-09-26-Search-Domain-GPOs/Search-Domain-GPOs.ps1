# Import the Group Policy module (usually loads automatically, but good practice)
Import-Module GroupPolicy

# Get all GPOs in the current domain
$allGPOs = Get-GPO -All

# Define a text target to search for (example: Remote Desktop policy name)
$settingName = "Allow users to connect remotely by using Remote Desktop Services"

# Optional secondary target (example: related registry path/value)
$registryKeyPath = "Software\Policies\Microsoft\Windows NT\Terminal Services"
$registryValueName = "fDenyTSConnections"

Write-Host "Searching all GPOs for text target(s)..."

# Loop through each GPO
foreach ($gpo in $allGPOs) {
    try {
        # Generate the GPO report as XML
        $reportPath = "$env:TEMP\$($gpo.Id).xml"
        Get-GPOReport -Guid $gpo.Id -ReportType Xml -Path $reportPath -ErrorAction Stop

        # Read the XML report content
        $reportContent = Get-Content -Path $reportPath -Raw

        # Check whether the report contains either example target
        if (($reportContent -match [regex]::Escape($settingName)) -or
            ($reportContent -match [regex]::Escape($registryKeyPath) -and
             $reportContent -match [regex]::Escape($registryValueName))) {

            Write-Host "Found in GPO: $($gpo.DisplayName) (ID: $($gpo.Id))"
        }

        # Clean up the temporary report file
        Remove-Item -Path $reportPath -Force
    }
    catch {
        Write-Warning "Could not process GPO: $($gpo.DisplayName) (ID: $($gpo.Id)). Error: $($_.Exception.Message)"
    }
}

Write-Host "Search complete."
