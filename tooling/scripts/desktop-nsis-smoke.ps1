$ErrorActionPreference = 'Stop'

$installerFiles = @(Get-ChildItem -LiteralPath 'apps/desktop/src-tauri/target/release/bundle/nsis' -Filter '*.exe')
if ($installerFiles.Count -ne 1) { throw "Expected one NSIS installer, found $($installerFiles.Count)." }
$installer = $installerFiles[0]

$temporaryBase = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { [System.IO.Path]::GetTempPath() }
$temporaryBase = [System.IO.Path]::GetFullPath($temporaryBase)
$testRoot = Join-Path $temporaryBase "forge-org-desktop-smoke-$([guid]::NewGuid().ToString('N'))"
$installRoot = Join-Path $testRoot 'installed'
$isolatedLocalAppData = Join-Path $testRoot 'local-app-data'
New-Item -ItemType Directory -Path $installRoot, $isolatedLocalAppData | Out-Null
$previousLocalAppData = $env:LOCALAPPDATA
$env:LOCALAPPDATA = $isolatedLocalAppData
$process = $null
$preexistingSidecarPids = @(Get-Process -Name 'forge-sidecar' -ErrorAction SilentlyContinue | ForEach-Object Id)
$sidecarPids = @()
$ownedSidecarPids = @()

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices;
public static class ForgeWindowNative {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential)] struct BITMAPINFOHEADER {
    public uint Size; public int Width, Height; public ushort Planes, BitCount; public uint Compression, ImageSize;
    public int XPelsPerMeter, YPelsPerMeter; public uint ColorsUsed, ColorsImportant;
  }
  [StructLayout(LayoutKind.Sequential)] struct BITMAPINFO { public BITMAPINFOHEADER Header; public uint Color; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int command);
  [DllImport("user32.dll")] static extern IntPtr GetWindowDC(IntPtr hWnd);
  [DllImport("user32.dll")] static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);
  [DllImport("gdi32.dll")] static extern IntPtr CreateCompatibleDC(IntPtr hDC);
  [DllImport("gdi32.dll")] static extern IntPtr CreateCompatibleBitmap(IntPtr hDC, int width, int height);
  [DllImport("gdi32.dll")] static extern IntPtr SelectObject(IntPtr hDC, IntPtr hObject);
  [DllImport("gdi32.dll")] static extern bool BitBlt(IntPtr dst, int x, int y, int width, int height, IntPtr src, int srcX, int srcY, uint operation);
  [DllImport("gdi32.dll")] static extern int GetDIBits(IntPtr hDC, IntPtr bitmap, uint start, uint lines, byte[] pixels, ref BITMAPINFO info, uint usage);
  [DllImport("gdi32.dll")] static extern bool DeleteObject(IntPtr hObject);
  [DllImport("gdi32.dll")] static extern bool DeleteDC(IntPtr hDC);

  public static bool CaptureWindow(IntPtr hWnd, string path) {
    RECT rect;
    if (!GetWindowRect(hWnd, out rect)) return false;
    int width = rect.Right - rect.Left, height = rect.Bottom - rect.Top;
    IntPtr source = GetWindowDC(hWnd), memory = IntPtr.Zero, bitmap = IntPtr.Zero, previous = IntPtr.Zero;
    try {
      memory = CreateCompatibleDC(source);
      bitmap = CreateCompatibleBitmap(source, width, height);
      previous = SelectObject(memory, bitmap);
      if (!BitBlt(memory, 0, 0, width, height, source, 0, 0, 0x00CC0020 | 0x40000000)) return false;
      BITMAPINFO info = new BITMAPINFO();
      info.Header.Size = (uint)Marshal.SizeOf(typeof(BITMAPINFOHEADER)); info.Header.Width = width; info.Header.Height = -height;
      info.Header.Planes = 1; info.Header.BitCount = 32; info.Header.ImageSize = (uint)(width * height * 4);
      byte[] pixels = new byte[(int)info.Header.ImageSize];
      if (GetDIBits(memory, bitmap, 0, (uint)height, pixels, ref info, 0) != height) return false;
      using (BinaryWriter writer = new BinaryWriter(File.Create(path))) {
        writer.Write((ushort)0x4D42); writer.Write((uint)(54 + pixels.Length)); writer.Write((uint)0); writer.Write((uint)54);
        writer.Write(info.Header.Size); writer.Write(info.Header.Width); writer.Write(info.Header.Height); writer.Write(info.Header.Planes);
        writer.Write(info.Header.BitCount); writer.Write(info.Header.Compression); writer.Write(info.Header.ImageSize);
        writer.Write(info.Header.XPelsPerMeter); writer.Write(info.Header.YPelsPerMeter); writer.Write(info.Header.ColorsUsed); writer.Write(info.Header.ColorsImportant);
        writer.Write(pixels);
      }
      return true;
    } finally {
      if (previous != IntPtr.Zero) SelectObject(memory, previous);
      if (bitmap != IntPtr.Zero) DeleteObject(bitmap);
      if (memory != IntPtr.Zero) DeleteDC(memory);
      if (source != IntPtr.Zero) ReleaseDC(hWnd, source);
    }
  }
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
  $screenshotPath = Join-Path (Split-Path -Parent $installer.FullName) 'forge-desktop-startup-v0.1.1-smoke.bmp'
  if (-not [ForgeWindowNative]::CaptureWindow($window.Handle, $screenshotPath)) {
    throw 'Windows native capture could not record the visible FORGE main window.'
  }

  # A second invocation must activate the existing window without starting a second sidecar.
  $sidecarPids = @(Get-Process -Name 'forge-sidecar' -ErrorAction SilentlyContinue | ForEach-Object Id)
  $ownedSidecarPids = @($sidecarPids | Where-Object { $preexistingSidecarPids -notcontains $_ })
  if ($ownedSidecarPids.Count -eq 0) { throw 'The isolated installed application did not start its own sidecar process.' }
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
  $newSidecarPids = @($sidecarsAfterSecondLaunch | Where-Object { $sidecarPids -notcontains $_.Id } | ForEach-Object Id)
  if ($newSidecarPids.Count -gt 0) {
    throw "Single-instance activation created additional sidecar processes; baseline=[$($sidecarPids -join ',')] current=[$(($sidecarsAfterSecondLaunch.Id) -join ',')] new=[$($newSidecarPids -join ',')]."
  }

  $workspaceName = "Installed UI smoke $([guid]::NewGuid().ToString('N').Substring(0, 10))"
  $workspaceInput.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).SetValue($workspaceName)
  $createButton.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
  $null = Wait-ForgeAutomationElement $root ([System.Windows.Automation.ControlType]::Text) $workspaceName

  $projectName = "Installed project smoke $([guid]::NewGuid().ToString('N').Substring(0, 10))"
  $projectInput = Wait-ForgeAutomationElement $root ([System.Windows.Automation.ControlType]::Edit) 'Project name'
  $projectInput.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).SetValue($projectName)
  $projectButton = Wait-ForgeAutomationElement $root ([System.Windows.Automation.ControlType]::Button) 'Create Project'
  $projectButton.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
  $null = Wait-ForgeAutomationElement $root ([System.Windows.Automation.ControlType]::Text) $projectName

  $databasePath = Join-Path $isolatedLocalAppData 'ForgeOrgTool/data/forge.db'
  if (-not (Test-Path -LiteralPath $databasePath -PathType Leaf)) {
    throw "The sidecar did not create the configured per-user SQLite database: $databasePath"
  }
  if (-not $process.CloseMainWindow()) { throw 'The installed FORGE window did not accept a graceful close request.' }
  if (-not $process.WaitForExit(15000)) { throw 'The installed FORGE desktop did not exit after its window was closed.' }
  $sidecarCleanupDeadline = [DateTime]::UtcNow.AddSeconds(15)
  do {
    $remainingSidecarPids = @($ownedSidecarPids | Where-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue })
    if ($remainingSidecarPids.Count -eq 0) { break }
    Start-Sleep -Milliseconds 250
  } while ([DateTime]::UtcNow -lt $sidecarCleanupDeadline)
  if ($remainingSidecarPids.Count -gt 0) { throw "Packaged sidecar processes remained after close: $($remainingSidecarPids -join ',')." }

  $process = Start-Process -FilePath $installedApp.FullName -PassThru
  $window = Get-ForgeWindow $process
  $restartedSidecarPids = @(Get-Process -Name 'forge-sidecar' -ErrorAction SilentlyContinue | ForEach-Object Id)
  $ownedSidecarPids += @($restartedSidecarPids | Where-Object { $preexistingSidecarPids -notcontains $_ -and $ownedSidecarPids -notcontains $_ })
  $root = Get-ForgeAutomationRoot $window.Handle
  $null = Wait-ForgeAutomationElement $root ([System.Windows.Automation.ControlType]::Text) $workspaceName
  $null = Wait-ForgeAutomationElement $root ([System.Windows.Automation.ControlType]::Text) $projectName
  Write-Output "PASS installed UI -> authenticated API -> SQLite -> restart; workspace='$workspaceName' project='$projectName' window='$($window.Title)' $($window.Width)x$($window.Height) database='$databasePath' screenshot='$screenshotPath'"
}
finally {
  if ($null -ne $process) {
    $process.Refresh()
    if (-not $process.HasExited) {
      if (-not $process.CloseMainWindow() -or -not $process.WaitForExit(15000)) {
        $process.Refresh()
        if (-not $process.HasExited) {
          Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
          try { $process.WaitForExit(15000) | Out-Null } catch { }
        }
      }
    }
  }
  $ownedSidecarIds = @($ownedSidecarPids | Sort-Object -Unique)
  $sidecarShutdownDeadline = [DateTime]::UtcNow.AddSeconds(15)
  do {
    $remainingSidecarPids = @($ownedSidecarIds | Where-Object {
      $candidate = Get-Process -Id $_ -ErrorAction SilentlyContinue
      $null -ne $candidate -and $candidate.Path -and
        $candidate.Path.StartsWith($installRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)
    })
    if ($remainingSidecarPids.Count -eq 0) { break }
    Start-Sleep -Milliseconds 250
  } while ([DateTime]::UtcNow -lt $sidecarShutdownDeadline)
  foreach ($sidecarPid in $remainingSidecarPids) {
    $sidecar = Get-Process -Id $sidecarPid -ErrorAction SilentlyContinue
    if ($null -ne $sidecar -and $sidecar.Path -and
        $sidecar.Path.StartsWith($installRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
      Stop-Process -Id $sidecarPid -Force -ErrorAction SilentlyContinue
      try { $sidecar.WaitForExit(15000) | Out-Null } catch { }
    }
  }
  $env:LOCALAPPDATA = $previousLocalAppData
  $resolvedTestRoot = [System.IO.Path]::GetFullPath($testRoot)
  $rootPrefix = $temporaryBase.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
  if (-not $resolvedTestRoot.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase) -or
      (Split-Path -Leaf $resolvedTestRoot) -notlike 'forge-org-desktop-smoke-*') {
    throw "Refusing to remove a Desktop smoke path outside its unique temporary directory: $resolvedTestRoot"
  }
  if (Test-Path -LiteralPath $resolvedTestRoot -PathType Container) {
    $lastCleanupError = $null
    for ($attempt = 0; $attempt -lt 10; $attempt++) {
      try {
        Remove-Item -LiteralPath $resolvedTestRoot -Recurse -Force -ErrorAction Stop
        $lastCleanupError = $null
        break
      } catch {
        $lastCleanupError = $_
        Start-Sleep -Milliseconds 500
      }
    }
    if ($null -ne $lastCleanupError) {
      throw "Could not remove the isolated Desktop smoke directory after waiting for owned processes to exit: $resolvedTestRoot. $lastCleanupError"
    }
  }
}
