$ErrorActionPreference = 'Stop'

$installer = Get-ChildItem -LiteralPath 'apps/desktop/src-tauri/target/release/bundle/nsis' -Filter '*.exe' |
  Select-Object -First 1
if ($null -eq $installer) {
  throw 'The Tauri NSIS bundle did not produce an installer executable.'
}

$installRoot = Join-Path $env:RUNNER_TEMP 'forge-org-tool-installed'
if (Test-Path -LiteralPath $installRoot) {
  Remove-Item -LiteralPath $installRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $installRoot | Out-Null

$install = Start-Process -FilePath $installer.FullName -ArgumentList "/S", "/D=$installRoot" -Wait -PassThru
if ($install.ExitCode -ne 0) {
  throw "NSIS installer exited with code $($install.ExitCode)."
}

$installedApp = Get-ChildItem -LiteralPath $installRoot -Filter '*.exe' -Recurse |
  Where-Object { $_.Name -notlike 'uninstall*' } |
  Select-Object -First 1
if ($null -eq $installedApp) {
  throw "NSIS installer did not place an application executable under $installRoot."
}

$process = Start-Process -FilePath $installedApp.FullName -PassThru
try {
  Start-Sleep -Seconds 8
  if ($process.HasExited) {
    throw "Installed application exited with code $($process.ExitCode)."
  }

  $sidecar = Get-Process -Name 'forge-sidecar' -ErrorAction SilentlyContinue
  if ($null -eq $sidecar) {
    throw 'Installed application did not keep its packaged sidecar running.'
  }
}
finally {
  if (-not $process.HasExited) {
    Stop-Process -Id $process.Id -Force
  }
  Get-Process -Name 'forge-sidecar' -ErrorAction SilentlyContinue | Stop-Process -Force
}
