$ErrorActionPreference = 'Stop'

$installerFiles = @(Get-ChildItem -LiteralPath 'apps/desktop/src-tauri/target/release/bundle/nsis' -Filter '*.exe')
if ($installerFiles.Count -ne 1) { throw "Expected one NSIS installer, found $($installerFiles.Count)." }
$installer = $installerFiles[0]

$testRoot = Join-Path $env:RUNNER_TEMP "forge-org-desktop-smoke-$([guid]::NewGuid().ToString('N'))"
$installRoot = Join-Path $testRoot 'installed'
$isolatedLocalAppData = Join-Path $testRoot 'local-app-data'
New-Item -ItemType Directory -Path $installRoot, $isolatedLocalAppData | Out-Null
$previousLocalAppData = $env:LOCALAPPDATA
$env:LOCALAPPDATA = $isolatedLocalAppData
$process = $null
$sidecarPids = @()

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class ForgeWindowNative {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int command);
}
'@

function Get-ForgeWindow($targetProcess) {
  $deadline = [DateTime]::UtcNow.AddSeconds(45)
  do {
    $targetProcess.Refresh()
    if ($targetProcess.HasExited) { throw "Installed desktop exited with code $($targetProcess.ExitCode)." }
    $handle = $targetProcess.MainWindowHandle
    if ($handle -ne [IntPtr]::Zero) {
      $rect = New-Object ForgeWindowNative+RECT
      if ([ForgeWindowNative]::IsWindowVisible($handle) -and [ForgeWindowNative]::GetWindowRect($handle, [ref]$rect)) {
        $width = $rect.Right - $rect.Left
        $height = $rect.Bottom - $rect.Top
        if ($width -ge 960 -and $height -ge 640 -and $targetProcess.MainWindowTitle -eq 'FORGE Org Tool') {
          return [pscustomobject]@{ Handle = $handle; Width = $width; Height = $height; Title = $targetProcess.MainWindowTitle }
        }
      }
    }
    Start-Sleep -Milliseconds 250
  } while ([DateTime]::UtcNow -lt $deadline)
  throw 'Installed FORGE main window was not visible with its expected title and usable dimensions.'
}

function Get-ForgeAutomationRoot($handle) {
  $root = [System.Windows.Automation.AutomationElement]::FromHandle($handle)
  if ($null -eq $root) { throw 'Windows UI Automation could not attach to the FORGE main window.' }
  return $root
}

function Wait-ForgeAutomationElement($root, [System.Windows.Automation.ControlType]$controlType, [string]$name, [int]$timeoutSeconds = 20) {
  $condition = New-Object System.Windows.Automation.AndCondition @(
    [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ControlTypeProperty, $controlType),
    [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::NameProperty, $name)
  )
  $deadline = [DateTime]::UtcNow.AddSeconds($timeoutSeconds)
  do {
    $element = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condition)
    if ($null -ne $element) { return $element }
    Start-Sleep -Milliseconds 250
  } while ([DateTime]::UtcNow -lt $deadline)
  throw "FORGE UI did not expose the expected $controlType named '$name'."
}

try {
  $install = Start-Process -FilePath $installer.FullName -ArgumentList "/S", "/D=$installRoot" -Wait -PassThru
  if ($install.ExitCode -ne 0) { throw "NSIS installer exited with code $($install.ExitCode)." }

  $installedApps = @(Get-ChildItem -LiteralPath $installRoot -Filter '*.exe' -Recurse |
    Where-Object { $_.Name -notlike 'uninstall*' -and $_.Name -notlike 'forge-sidecar*' })
  if ($installedApps.Count -ne 1) { throw "Expected one installed application executable, found $($installedApps.Count)." }
  $installedApp = $installedApps[0]

  $process = Start-Process -FilePath $installedApp.FullName -PassThru
  $window = Get-ForgeWindow $process
  $root = Get-ForgeAutomationRoot $window.Handle
  $null = Wait-ForgeAutomationElement $root ([System.Windows.Automation.ControlType]::Text) 'No workspaces yet'
  $workspaceInput = Wait-ForgeAutomationElement $root ([System.Windows.Automation.ControlType]::Edit) 'Workspace name'
  $createButton = Wait-ForgeAutomationElement $root ([System.Windows.Automation.ControlType]::Button) 'Create Workspace'
  $bounds = New-Object ForgeWindowNative+RECT
  $null = [ForgeWindowNative]::GetWindowRect($window.Handle, [ref]$bounds)
  $screenshotPath = Join-Path (Split-Path -Parent $installer.FullName) 'forge-desktop-startup-v0.1.1-smoke.png'
  $bitmap = New-Object System.Drawing.Bitmap ($bounds.Right - $bounds.Left), ($bounds.Bottom - $bounds.Top)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen($bounds.Left, $bounds.Top, 0, 0, $bitmap.Size)
  $bitmap.Save($screenshotPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()

  # A second invocation must activate the existing window without starting a second sidecar.
  $sidecarPids = @(Get-Process -Name 'forge-sidecar' -ErrorAction SilentlyContinue | ForEach-Object Id)
  $null = [ForgeWindowNative]::ShowWindow($window.Handle, 6)
  if (-not [ForgeWindowNative]::IsIconic($window.Handle)) { throw 'The smoke test could not minimize the FORGE window.' }
  $second = Start-Process -FilePath $installedApp.FullName -PassThru
  $activationDeadline = [DateTime]::UtcNow.AddSeconds(15)
  do {
    Start-Sleep -Milliseconds 250
    $process.Refresh()
  } while ([ForgeWindowNative]::IsIconic($window.Handle) -and [DateTime]::UtcNow -lt $activationDeadline)
  if ($process.HasExited -or $process.MainWindowHandle -ne $window.Handle -or [ForgeWindowNative]::IsIconic($window.Handle) -or -not [ForgeWindowNative]::IsWindowVisible($window.Handle)) {
    throw 'A second launch failed to activate the original FORGE main window.'
  }
  if (-not $second.WaitForExit(15000)) { throw 'The second FORGE process did not hand off to the existing instance.' }
  $sidecarsAfterSecondLaunch = @(Get-Process -Name 'forge-sidecar' -ErrorAction SilentlyContinue)
  if ($sidecarsAfterSecondLaunch.Count -ne 1) { throw 'Single-instance activation created multiple sidecar processes.' }

  $workspaceName = "Installed UI smoke $([guid]::NewGuid().ToString('N').Substring(0, 10))"
  $workspaceInput.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).SetValue($workspaceName)
  $createButton.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
  $null = Wait-ForgeAutomationElement $root ([System.Windows.Automation.ControlType]::Text) $workspaceName

  $databasePath = Join-Path $isolatedLocalAppData 'ForgeOrgTool/data/forge.db'
  if (-not (Test-Path -LiteralPath $databasePath -PathType Leaf)) {
    throw "The sidecar did not create the configured per-user SQLite database: $databasePath"
  }
  if (-not $process.CloseMainWindow()) { throw 'The installed FORGE window did not accept a graceful close request.' }
  if (-not $process.WaitForExit(15000)) { throw 'The installed FORGE desktop did not exit after its window was closed.' }
  Start-Sleep -Seconds 2
  if (@(Get-Process -Name 'forge-sidecar' -ErrorAction SilentlyContinue).Count -ne 0) {
    throw 'The packaged sidecar remained alive after the desktop application closed.'
  }

  $process = Start-Process -FilePath $installedApp.FullName -PassThru
  $window = Get-ForgeWindow $process
  $root = Get-ForgeAutomationRoot $window.Handle
  $null = Wait-ForgeAutomationElement $root ([System.Windows.Automation.ControlType]::Text) $workspaceName
  Write-Output "PASS installed UI -> authenticated API -> SQLite -> restart; window='$($window.Title)' $($window.Width)x$($window.Height) database='$databasePath' screenshot='$screenshotPath'"
}
finally {
  if ($null -ne $process -and -not $process.HasExited) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Milliseconds 500
  foreach ($sidecar in Get-Process -Name 'forge-sidecar' -ErrorAction SilentlyContinue) {
    if ($sidecarPids -notcontains $sidecar.Id) { Stop-Process -Id $sidecar.Id -Force -ErrorAction SilentlyContinue }
  }
  $env:LOCALAPPDATA = $previousLocalAppData
}
