param(
    [string]$OutputDirectory = "$PSScriptRoot/src-tauri/binaries"
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Resolve-Path "$PSScriptRoot/../.."
$output = New-Item -ItemType Directory -Force -Path $OutputDirectory
$artifact = Join-Path $output 'forge-sidecar-x86_64-pc-windows-msvc.exe'

Push-Location $repositoryRoot
try {
    uv run --project apps/api --with pyinstaller pyinstaller `
        --clean --noconfirm --onefile --name forge-sidecar `
        --paths apps/api/src apps/desktop/sidecar_entry.py
    Copy-Item -LiteralPath 'dist/forge-sidecar.exe' -Destination $artifact -Force
}
finally {
    Pop-Location
}

Write-Output "Packaged isolated sidecar: $artifact"
