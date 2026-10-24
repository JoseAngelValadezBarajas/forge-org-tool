param([string]$InstallerPath)

$ErrorActionPreference = 'Stop'

if ($PSBoundParameters.ContainsKey('InstallerPath')) {
  $installer = Get-Item -LiteralPath $InstallerPath
  if ($installer.PSIsContainer -or $installer.Extension -ne '.exe') {
    throw "The supplied Desktop installer path is not an executable file: $InstallerPath"
  }
} else {
  $installerFiles = @(Get-ChildItem -LiteralPath 'apps/desktop/src-tauri/target/release/bundle/nsis' -Filter '*.exe')
  if ($installerFiles.Count -ne 1) { throw "Expected one NSIS installer, found $($installerFiles.Count)." }
  $installer = $installerFiles[0]
}

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
Add-Type -AssemblyName System.Windows.Forms
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
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extraInfo);
  [DllImport("user32.dll")] public static extern IntPtr GetDlgItem(IntPtr hDlg, int nIDDlgItem);
  [DllImport("user32.dll", SetLastError = true)]
  static extern IntPtr SendMessage(IntPtr hWnd, uint message, IntPtr wParam, IntPtr lParam);
  [DllImport("user32.dll", EntryPoint = "SendMessageW", CharSet = CharSet.Unicode, SetLastError = true)]
  static extern IntPtr SendMessageBuffer(IntPtr hWnd, uint message, IntPtr wParam, System.Text.StringBuilder text);
  public static string ReadWindowText(IntPtr hWnd) {
    System.Text.StringBuilder text = new System.Text.StringBuilder(2048);
    SendMessageBuffer(hWnd, 0x000D, new IntPtr(text.Capacity), text); // WM_GETTEXT across process boundary
    return text.ToString();
  }
  public static void ClickDialogButton(IntPtr hWnd) {
    SendMessage(hWnd, 0x00F5, IntPtr.Zero, IntPtr.Zero); // BM_CLICK: activate the native button control
  }
  public static void ClickControlCenter(IntPtr hWnd) {
    RECT rect;
    if (!GetWindowRect(hWnd, out rect)) throw new InvalidOperationException("Could not locate the native input control.");
    SetCursorPos((rect.Left + rect.Right) / 2, (rect.Top + rect.Bottom) / 2);
    mouse_event(0x0002, 0, 0, 0, UIntPtr.Zero);
    mouse_event(0x0004, 0, 0, 0, UIntPtr.Zero);
  }
  [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr hWnd, uint command);
  public static IntPtr GetWindowOwner(IntPtr hWnd) { return GetWindow(hWnd, 4); }
  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  static extern int GetClassName(IntPtr hWnd, System.Text.StringBuilder className, int maxCount);
  public static string ReadClassName(IntPtr hWnd) {
    System.Text.StringBuilder className = new System.Text.StringBuilder(256);
    GetClassName(hWnd, className, className.Capacity);
    return className.ToString();
  }
  public static IntPtr FindDescendantByClass(IntPtr parent, string expectedClass) {
    IntPtr child = GetWindow(parent, 5);
    while (child != IntPtr.Zero) {
      if (String.Equals(ReadClassName(child), expectedClass, StringComparison.OrdinalIgnoreCase)) return child;
      IntPtr nested = FindDescendantByClass(child, expectedClass);
      if (nested != IntPtr.Zero) return nested;
      child = GetWindow(child, 2);
    }
    return IntPtr.Zero;
  }
  static void AppendChildClasses(IntPtr parent, System.Text.StringBuilder output, int depth, int[] count) {
    if (depth > 5 || count[0] >= 80) return;
    IntPtr child = GetWindow(parent, 5);
    while (child != IntPtr.Zero && count[0] < 80) {
      output.Append("hwnd=").Append(child.ToInt64()).Append(":").Append(ReadClassName(child)).Append("; ");
      count[0]++;
      AppendChildClasses(child, output, depth + 1, count);
      child = GetWindow(child, 2);
    }
  }
  public static string DescribeChildClasses(IntPtr parent) {
    System.Text.StringBuilder output = new System.Text.StringBuilder();
    int[] count = new int[] { 0 };
    AppendChildClasses(parent, output, 0, count);
    return output.ToString();
  }
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

function Wait-ForgeAutomationElement($root, [System.Windows.Automation.ControlType]$controlType, [string]$name, [int]$timeoutSeconds = 45) {
  $deadline = [DateTime]::UtcNow.AddSeconds($timeoutSeconds)
  do {
    $elements = $root.FindAll(
      [System.Windows.Automation.TreeScope]::Descendants,
      [System.Windows.Automation.Condition]::TrueCondition
    )
    foreach ($element in $elements) {
      if (
        $element.Current.Name -eq $name -and
        $element.Current.ControlType.Id -eq $controlType.Id
      ) { return $element }
    }
    Start-Sleep -Milliseconds 250
  } while ([DateTime]::UtcNow -lt $deadline)
  $visibleControls = $root.FindAll(
    [System.Windows.Automation.TreeScope]::Descendants,
    [System.Windows.Automation.Condition]::TrueCondition
  )
  $lastChance = @($visibleControls | Where-Object {
    $_.Current.Name.Trim() -eq $name.Trim() -and $_.Current.ControlType.Id -eq $controlType.Id
  } | Select-Object -First 1)
  if ($lastChance.Count -gt 0) { return $lastChance[0] }
  $sameNameControls = @($visibleControls | Where-Object { $_.Current.Name.Trim() -eq $name.Trim() })
  $sameNameSummary = @($sameNameControls | ForEach-Object {
    "type='$($_.Current.ControlType.ProgrammaticName)' typeId='$($_.Current.ControlType.Id)' name='$($_.Current.Name)'"
  })
  $summary = @($visibleControls | Select-Object -First 100 | ForEach-Object {
    "type='$($_.Current.ControlType.ProgrammaticName)' name='$($_.Current.Name)' id='$($_.Current.AutomationId)'"
  })
  $failureScreenshot = Join-Path (Split-Path -Parent $installer.FullName) 'forge-desktop-startup-v0.1.1-failure-smoke.bmp'
  [ForgeWindowNative]::CaptureWindow($root.Current.NativeWindowHandle, $failureScreenshot) | Out-Null
  throw "FORGE UI did not expose the expected $controlType (typeId='$($controlType.Id)') named '$name'. Same-name controls: $($sameNameSummary -join '; '). UIA elements: $($summary -join '; '). Failure screenshot: $failureScreenshot"
}

function Wait-ForgeAutomationNamedElement($root, [string]$name, [int]$timeoutSeconds = 20) {
  $condition = [System.Windows.Automation.PropertyCondition]::new(
    [System.Windows.Automation.AutomationElement]::NameProperty, $name
  )
  $deadline = [DateTime]::UtcNow.AddSeconds($timeoutSeconds)
  do {
    $element = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condition)
    if ($null -ne $element) { return $element }
    Start-Sleep -Milliseconds 250
  } while ([DateTime]::UtcNow -lt $deadline)
  throw "FORGE UI did not expose an accessible control named '$name'."
}

function Invoke-ForgeAutomationElement($element, [string]$name) {
  $pattern = $null
  if ($element.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$pattern)) {
    $pattern.Invoke()
    return
  }
  if ($element.TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern, [ref]$pattern)) {
    $pattern.Select()
    return
  }
  if ($element.TryGetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern, [ref]$pattern)) {
    if ($pattern.Current.ToggleState -eq [System.Windows.Automation.ToggleState]::Off) { $pattern.Toggle() }
    return
  }
  throw "Unsupported UI Automation patterns for control '$name' ($($element.Current.ControlType))."
}

function Invoke-ForgeElement($root, [System.Windows.Automation.ControlType]$controlType, [string]$name) {
  $element = Wait-ForgeAutomationElement $root $controlType $name
  Invoke-ForgeAutomationElement $element $name
}

function Set-ForgeElementValue($root, [System.Windows.Automation.ControlType]$controlType, [string]$name, [string]$value) {
  $element = Wait-ForgeAutomationElement $root $controlType $name
  $element.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).SetValue($value)
}

function Assert-ForgeSqliteRecord([string]$databasePath, [string]$table, [string]$name) {
  $result = & uv run --project apps/api --locked python tooling/scripts/verify-desktop-smoke-db.py $databasePath $table $name
  if ($LASTEXITCODE -ne 0) { throw "Could not verify synthetic '$table' record in SQLite." }
}

function Select-ForgeOption($root, [string]$comboBoxName, [string]$optionName) {
  $combo = Wait-ForgeAutomationElement $root ([System.Windows.Automation.ControlType]::ComboBox) $comboBoxName
  $expandPattern = $combo.GetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern)
  $expandPattern.Expand()
  try {
    $option = Wait-ForgeAutomationElement $root ([System.Windows.Automation.ControlType]::ListItem) $optionName
    try {
      $option.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
    } catch {
      $option.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Select()
    }
  } finally {
    if ($expandPattern.Current.ExpandCollapseState -eq [System.Windows.Automation.ExpandCollapseState]::Expanded) {
      $expandPattern.Collapse()
    }
  }
}

function Wait-ForgeAutomationDialogClosed($desktop, $ownerRoot, $dialog, [int]$timeoutSeconds = 15) {
  $dialogHandle = $dialog.Current.NativeWindowHandle
  $dialogRuntimeId = $dialog.GetRuntimeId() -join '.'
  $dialogName = $dialog.Current.Name
  $deadline = [DateTime]::UtcNow.AddSeconds($timeoutSeconds)
  do {
    if (-not [ForgeWindowNative]::IsWindowVisible($dialogHandle)) { return }
    try {
      $windows = $desktop.FindAll(
        [System.Windows.Automation.TreeScope]::Children,
        [System.Windows.Automation.Condition]::TrueCondition
      )
      $ownerDescendants = $ownerRoot.FindAll(
        [System.Windows.Automation.TreeScope]::Descendants,
        [System.Windows.Automation.Condition]::TrueCondition
      )
      $dialogStillOpen = @($windows | Where-Object {
        $dialogHandle -ne [IntPtr]::Zero -and $_.Current.NativeWindowHandle -eq $dialogHandle
      }).Count -gt 0
      if (-not $dialogStillOpen) {
        $dialogStillOpen = @($ownerDescendants | Where-Object {
          $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::Window -and
          (
            ($dialogHandle -ne [IntPtr]::Zero -and $_.Current.NativeWindowHandle -eq $dialogHandle) -or
            ($dialogRuntimeId -and (($_.GetRuntimeId() -join '.') -eq $dialogRuntimeId)) -or
            ($dialogName -and $_.Current.Name -eq $dialogName -and
              [ForgeWindowNative]::GetWindowOwner($_.Current.NativeWindowHandle) -eq $ownerRoot.Current.NativeWindowHandle)
          )
        }).Count -gt 0
      }
      if (-not $dialogStillOpen -and -not [ForgeWindowNative]::IsWindowVisible($dialogHandle)) { return }
    } catch {
      if (-not [ForgeWindowNative]::IsWindowVisible($dialogHandle)) { return }
    }
    Start-Sleep -Milliseconds 100
  } while ([DateTime]::UtcNow -lt $deadline)
  if (-not [ForgeWindowNative]::IsWindowVisible($dialogHandle)) { return }
  throw "The native file picker remained open after selecting '$($dialog.Current.Name)'."
}

function Choose-ForgeFile($root, [string]$buttonName, [string]$filePath) {
  $fileControl = Wait-ForgeAutomationNamedElement $root $buttonName
  Invoke-ForgeAutomationElement $fileControl $buttonName
  $desktop = [System.Windows.Automation.AutomationElement]::RootElement
  $dialog = $null
  $deadline = [DateTime]::UtcNow.AddSeconds(15)
  do {
    $windows = $desktop.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition)
    $candidates = @($windows)
    if ($null -ne $root) {
      $candidates += @($root.FindAll(
        [System.Windows.Automation.TreeScope]::Descendants,
        [System.Windows.Automation.Condition]::TrueCondition
      ))
    }
    foreach ($candidate in $candidates) {
      $candidateHandle = [IntPtr]$candidate.Current.NativeWindowHandle
      $candidateOwnedByApp = $candidateHandle -ne [IntPtr]::Zero -and
        [ForgeWindowNative]::GetWindowOwner($candidateHandle) -eq $root.Current.NativeWindowHandle
      if (
        $candidate.Current.ControlType -eq [System.Windows.Automation.ControlType]::Window -and
        $candidateOwnedByApp -and
        $candidateHandle -ne $root.Current.NativeWindowHandle -and
        (
          $candidate.Current.ClassName -eq '#32770' -or
          $candidate.Current.Name -match '(?i)^(open|abrir|choose|select|seleccionar)$'
        )
      ) {
        $candidateControls = $candidate.FindAll(
          [System.Windows.Automation.TreeScope]::Descendants,
          [System.Windows.Automation.Condition]::TrueCondition
        )
        $hasFileName = @($candidateControls | Where-Object {
          $_.Current.AutomationId -eq '1148' -or
          (
            $_.Current.ControlType -in @(
              [System.Windows.Automation.ControlType]::Edit,
              [System.Windows.Automation.ControlType]::ComboBox
            ) -and $_.Current.Name -match '(?i)(file name|nombre de archivo|^nombre$)'
          )
        }).Count -gt 0
        $hasOpenAction = @($candidateControls | Where-Object {
          $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::Button -and
          $_.Current.Name -match '(?i)^(open|abrir)$'
        }).Count -gt 0
        $nativeOpenButton = [ForgeWindowNative]::GetDlgItem($candidateHandle, 1)
        if ($hasFileName -and ($hasOpenAction -or $nativeOpenButton -ne [IntPtr]::Zero)) {
          $dialog = $candidate
          break
        }
      }
    }
    if ($null -eq $dialog) { Start-Sleep -Milliseconds 250 }
  } while ($null -eq $dialog -and [DateTime]::UtcNow -lt $deadline)
  if ($null -eq $dialog) {
    $visibleWindows = @($windows | ForEach-Object { "'$($_.Current.Name)' class='$($_.Current.ClassName)' type='$($_.Current.ControlType)' hwnd=$($_.Current.NativeWindowHandle)" })
    $rootControls = $root.FindAll(
      [System.Windows.Automation.TreeScope]::Descendants,
      [System.Windows.Automation.Condition]::TrueCondition
    )
    $rootSummary = @($rootControls | Select-Object -First 80 | ForEach-Object {
      $candidateHandle = [IntPtr]$_.Current.NativeWindowHandle
      $candidateOwner = if ($candidateHandle -ne [IntPtr]::Zero) {
        [ForgeWindowNative]::GetWindowOwner($candidateHandle).ToInt64()
      } else { 0 }
      "type='$($_.Current.ControlType.ProgrammaticName)' id='$($_.Current.AutomationId)' class='$($_.Current.ClassName)' hwnd=$($candidateHandle.ToInt64()) owner=$candidateOwner"
    })
    Write-Output "Native picker failure UIA elements: $($rootSummary -join '; ')"
    if (-not [ForgeWindowNative]::CaptureWindow($root.Current.NativeWindowHandle, $screenshotPath)) {
      Write-Output 'Could not capture the live window after the native picker failure.'
    }
    throw "Windows did not expose the screenshot file picker to UI Automation. Top-level windows: $($visibleWindows -join '; ')"
  }

  $dialogControls = $dialog.FindAll(
    [System.Windows.Automation.TreeScope]::Descendants,
    [System.Windows.Automation.Condition]::TrueCondition
  )
  $fileNameControl = $dialogControls | Where-Object {
    $_.Current.AutomationId -eq '1148' -or
    (
      $_.Current.ControlType -in @(
        [System.Windows.Automation.ControlType]::Edit,
        [System.Windows.Automation.ControlType]::ComboBox
      ) -and
      $_.Current.Name -match '(?i)(file name|nombre de archivo|^nombre$)' -and
      $_.Current.AutomationId -ne 'System.ItemNameDisplay'
    )
  } | Select-Object -First 1
  $fileNameInput = if (
    $null -ne $fileNameControl -and
    $fileNameControl.Current.ControlType -in @(
      [System.Windows.Automation.ControlType]::Edit,
      [System.Windows.Automation.ControlType]::ComboBox
    )
  ) { $fileNameControl } else { $null }
  $valuePattern = $null
  [ForgeWindowNative]::SetForegroundWindow($dialog.Current.NativeWindowHandle) | Out-Null
  $nativeFileNameHandle = [ForgeWindowNative]::GetDlgItem($dialog.Current.NativeWindowHandle, 1148)
  if ($nativeFileNameHandle -eq [IntPtr]::Zero -and $null -ne $fileNameControl) {
    $nativeFileNameHandle = [IntPtr]$fileNameControl.Current.NativeWindowHandle
  }
  $nativeFileNameEditHandle = if ($nativeFileNameHandle -ne [IntPtr]::Zero) {
    [ForgeWindowNative]::FindDescendantByClass($nativeFileNameHandle, 'Edit')
  } else { [IntPtr]::Zero }
  if ($nativeFileNameEditHandle -eq [IntPtr]::Zero) { $nativeFileNameEditHandle = $nativeFileNameHandle }
  $fieldControls = @($dialogControls | Where-Object {
    $_.Current.AutomationId -eq '1148' -or $_.Current.ControlType -in @(
      [System.Windows.Automation.ControlType]::Edit,
      [System.Windows.Automation.ControlType]::ComboBox
    )
  } | Select-Object -First 12 | ForEach-Object {
    "type='$($_.Current.ControlType.ProgrammaticName)' id='$($_.Current.AutomationId)' hwnd=$($_.Current.NativeWindowHandle)"
  })
  Write-Output "Native picker handles: dialog=$($dialog.Current.NativeWindowHandle) id1148=$nativeFileNameHandle edit=$nativeFileNameEditHandle fields=[$($fieldControls -join '; ')] childClasses=[$([ForgeWindowNative]::DescribeChildClasses($dialog.Current.NativeWindowHandle))]"
  $nativeFileNameAutomation = if ($nativeFileNameEditHandle -ne [IntPtr]::Zero) {
    [System.Windows.Automation.AutomationElement]::FromHandle($nativeFileNameEditHandle)
  } else { $null }
  $nativeValuePattern = $null
  if ($null -ne $nativeFileNameAutomation -and $nativeFileNameAutomation.TryGetCurrentPattern(
      [System.Windows.Automation.ValuePattern]::Pattern,
      [ref]$nativeValuePattern
    )) {
    $nativeValuePattern.SetValue($filePath)
    if ($nativeValuePattern.Current.Value -cne $filePath) {
      throw 'The native filename ValuePattern did not retain the synthetic screenshot path.'
    }
  } elseif ($null -ne $fileNameInput -and $fileNameInput.TryGetCurrentPattern(
      [System.Windows.Automation.ValuePattern]::Pattern,
      [ref]$valuePattern
    )) {
    $valuePattern.SetValue($filePath)
    if ($valuePattern.Current.Value -cne $filePath) {
      throw 'The UI Automation filename field did not retain the synthetic screenshot path.'
    }
  } else {
    if ($nativeFileNameHandle -eq [IntPtr]::Zero) {
      throw 'Windows did not expose an editable filename field for the screenshot picker.'
    }
    $previousClipboard = [System.Windows.Forms.Clipboard]::GetDataObject()
    try {
      [System.Windows.Forms.Clipboard]::SetText($filePath)
      [ForgeWindowNative]::ClickControlCenter($nativeFileNameEditHandle)
      Start-Sleep -Milliseconds 100
      [System.Windows.Forms.SendKeys]::SendWait('^a')
      [System.Windows.Forms.SendKeys]::SendWait('^v')
      Start-Sleep -Milliseconds 250
      if ([ForgeWindowNative]::ReadWindowText($nativeFileNameEditHandle) -cne $filePath) {
        throw 'The screenshot path was not entered into the focused native filename field.'
      }
    } finally {
      if ($null -ne $previousClipboard) {
        [System.Windows.Forms.Clipboard]::SetDataObject($previousClipboard, $true)
      } else {
        [System.Windows.Forms.Clipboard]::Clear()
      }
    }
  }
  $openControl = $dialogControls | Where-Object {
    $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::Button -and
    $_.Current.Name -match '(?i)^(open|abrir)$'
  } | Select-Object -First 1
  $nativeOpenButton = [ForgeWindowNative]::GetDlgItem($dialog.Current.NativeWindowHandle, 1)
  if ($null -ne $openControl) {
    Invoke-ForgeAutomationElement $openControl 'Open screenshot picker'
  } elseif ($nativeOpenButton -ne [IntPtr]::Zero) {
    [ForgeWindowNative]::ClickDialogButton($nativeOpenButton)
  } else {
    throw 'The verified native screenshot picker did not expose its Open action.'
  }
  if ([ForgeWindowNative]::IsWindowVisible($dialog.Current.NativeWindowHandle)) {
    if ($nativeOpenButton -eq [IntPtr]::Zero) {
      $nativeOpenButton = [IntPtr]$openControl.Current.NativeWindowHandle
    }
    if ($nativeOpenButton -eq [IntPtr]::Zero) {
      throw 'The named Open action did not expose a native handle.'
    }
    [ForgeWindowNative]::ClickDialogButton($nativeOpenButton)
  }
  try {
    Wait-ForgeAutomationDialogClosed $desktop $root $dialog
  } catch {
    $fieldValuePattern = $null
    $fieldValue = ''
    if ($null -ne $fileNameControl -and $fileNameControl.TryGetCurrentPattern(
        [System.Windows.Automation.ValuePattern]::Pattern,
        [ref]$fieldValuePattern
      )) {
      $fieldValue = [System.IO.Path]::GetFileName([string]$fieldValuePattern.Current.Value)
    }
    $pickerControls = @($dialogControls | Select-Object -First 80 | ForEach-Object {
      "type='$($_.Current.ControlType.ProgrammaticName)' id='$($_.Current.AutomationId)'"
    })
    $fieldDescription = if ($null -eq $fileNameControl) {
      'not found'
    } else {
      "type='$($fileNameControl.Current.ControlType.ProgrammaticName)' id='$($fileNameControl.Current.AutomationId)' value-basename='$fieldValue'"
    }
    throw "Native file picker did not close. File field: $fieldDescription. Picker UIA controls: $($pickerControls -join '; '). Original failure: $($_.Exception.Message)"
  }
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
  $databasePath = Join-Path $isolatedLocalAppData 'ForgeOrgTool/data/forge.db'
  $null = Wait-ForgeAutomationElement $root ([System.Windows.Automation.ControlType]::Button) 'Create your first project'
  Assert-ForgeSqliteRecord $databasePath 'workspaces' $workspaceName

  $projectName = "Installed project smoke $([guid]::NewGuid().ToString('N').Substring(0, 10))"
  Invoke-ForgeElement $root ([System.Windows.Automation.ControlType]::Button) 'New project'
  $projectInput = Wait-ForgeAutomationElement $root ([System.Windows.Automation.ControlType]::Edit) 'Project name'
  $projectInput.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).SetValue($projectName)
  $projectButton = Wait-ForgeAutomationElement $root ([System.Windows.Automation.ControlType]::Button) 'Create Project'
  $projectButton.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
  $null = Wait-ForgeAutomationElement $root ([System.Windows.Automation.ControlType]::Hyperlink) $projectName
  Assert-ForgeSqliteRecord $databasePath 'projects' $projectName

  # Exercise a real Bug attachment through the installed React UI and local sidecar.
  $epicName = "Installed Epic smoke $([guid]::NewGuid().ToString('N').Substring(0, 10))"
  $workItemName = "Installed Bug smoke $([guid]::NewGuid().ToString('N').Substring(0, 10))"
  $bugAttachmentName = 'forge-desktop-bug.png'
  $bugAttachmentPath = Join-Path $testRoot $bugAttachmentName
  $pngBytes = [Convert]::FromBase64String('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC')
  [System.IO.File]::WriteAllBytes($bugAttachmentPath, $pngBytes)

  Invoke-ForgeElement $root ([System.Windows.Automation.ControlType]::Hyperlink) $projectName
  $null = Wait-ForgeAutomationElement $root ([System.Windows.Automation.ControlType]::Text) 'Project Overview'
  Invoke-ForgeElement $root ([System.Windows.Automation.ControlType]::Hyperlink) 'Open planning board'
  $null = Wait-ForgeAutomationElement $root ([System.Windows.Automation.ControlType]::Text) 'Project Board'
  Invoke-ForgeElement $root ([System.Windows.Automation.ControlType]::Button) 'New Epic'
  Set-ForgeElementValue $root ([System.Windows.Automation.ControlType]::Edit) 'Epic title' $epicName
  Invoke-ForgeElement $root ([System.Windows.Automation.ControlType]::Button) 'Create Epic'
  $null = Wait-ForgeAutomationElement $root ([System.Windows.Automation.ControlType]::Hyperlink) $epicName

  Invoke-ForgeElement $root ([System.Windows.Automation.ControlType]::Hyperlink) $epicName
  Invoke-ForgeElement $root ([System.Windows.Automation.ControlType]::Button) 'New Work Item'
  Set-ForgeElementValue $root ([System.Windows.Automation.ControlType]::Edit) 'Work Item title' $workItemName
  Invoke-ForgeElement $root ([System.Windows.Automation.ControlType]::Button) 'Bug'
  $null = Wait-ForgeAutomationElement $root ([System.Windows.Automation.ControlType]::ComboBox) 'Bug severity'
  Set-ForgeElementValue $root ([System.Windows.Automation.ControlType]::Edit) 'Steps to reproduce' 'Open the synthetic report.'
  Set-ForgeElementValue $root ([System.Windows.Automation.ControlType]::Edit) 'Expected result' 'The report loads.'
  Set-ForgeElementValue $root ([System.Windows.Automation.ControlType]::Edit) 'Actual result' 'A synthetic failure is shown.'
  Invoke-ForgeElement $root ([System.Windows.Automation.ControlType]::Button) 'Create Work Item'
  Invoke-ForgeElement $root ([System.Windows.Automation.ControlType]::Hyperlink) $workItemName
  Choose-ForgeFile $root 'Add Bug screenshot' $bugAttachmentPath
  try {
    $null = Wait-ForgeAutomationElement $root ([System.Windows.Automation.ControlType]::Image) "Bug screenshot: $bugAttachmentName" 45
  } catch {
    $visibleControls = $root.FindAll(
      [System.Windows.Automation.TreeScope]::Descendants,
      [System.Windows.Automation.Condition]::TrueCondition
    )
    $summary = @($visibleControls | Select-Object -First 100 | ForEach-Object {
      "type='$($_.Current.ControlType.ProgrammaticName)' name='$($_.Current.Name)' id='$($_.Current.AutomationId)'"
    })
    $failureScreenshot = Join-Path (Split-Path -Parent $installer.FullName) 'forge-desktop-startup-v0.1.1-failure-smoke.bmp'
    [ForgeWindowNative]::CaptureWindow($root.Current.NativeWindowHandle, $failureScreenshot) | Out-Null
    throw "Bug screenshot did not render after upload. UIA elements: $($summary -join '; '). Original failure: $($_.Exception.Message)"
  }

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
  $null = Wait-ForgeAutomationElement $root ([System.Windows.Automation.ControlType]::Hyperlink) $projectName
  Assert-ForgeSqliteRecord $databasePath 'workspaces' $workspaceName
  Assert-ForgeSqliteRecord $databasePath 'projects' $projectName
  Invoke-ForgeElement $root ([System.Windows.Automation.ControlType]::Hyperlink) $projectName
  $null = Wait-ForgeAutomationElement $root ([System.Windows.Automation.ControlType]::Text) 'Project Overview'
  Invoke-ForgeElement $root ([System.Windows.Automation.ControlType]::Hyperlink) 'Open planning board'
  $null = Wait-ForgeAutomationElement $root ([System.Windows.Automation.ControlType]::Text) 'Project Board'
  Invoke-ForgeElement $root ([System.Windows.Automation.ControlType]::Hyperlink) $epicName
  Invoke-ForgeElement $root ([System.Windows.Automation.ControlType]::Hyperlink) $workItemName
  $null = Wait-ForgeAutomationElement $root ([System.Windows.Automation.ControlType]::Image) "Bug screenshot: $bugAttachmentName"
  Write-Output "PASS installed UI -> authenticated API -> SQLite -> restart; workspace='$workspaceName' project='$projectName' epic='$epicName' bug='$workItemName' attachment='$bugAttachmentName' window='$($window.Title)' $($window.Width)x$($window.Height) database='$databasePath' screenshot='$screenshotPath'"
}
catch {
  $sidecarLog = Join-Path $isolatedLocalAppData 'ForgeOrgTool/logs/sidecar.log'
  if (Test-Path -LiteralPath $sidecarLog -PathType Leaf) {
    $logLines = @(Get-Content -LiteralPath $sidecarLog -Tail 80 | ForEach-Object {
      $_ -replace '(?i)Bearer\s+\S+', 'Bearer [redacted]'
    })
    Write-Output "Synthetic sidecar log tail: $($logLines -join [Environment]::NewLine)"
  }
  throw
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
  $installedSidecarIds = @(Get-Process -Name 'forge-sidecar' -ErrorAction SilentlyContinue |
    Where-Object {
      $_.Path -and $_.Path.StartsWith(
        $installRoot + [System.IO.Path]::DirectorySeparatorChar,
        [System.StringComparison]::OrdinalIgnoreCase
      )
    } | ForEach-Object Id)
  $ownedSidecarIds = @(@($ownedSidecarPids) + @($installedSidecarIds) | Sort-Object -Unique)
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
