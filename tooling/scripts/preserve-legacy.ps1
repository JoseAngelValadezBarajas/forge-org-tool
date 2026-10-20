# Explicit user-run preservation only. Never commits a database or uploads local backups.
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$LegacyPath,
  [string]$BackupDirectory = (Join-Path ([Environment]::GetFolderPath('UserProfile')) 'ForgeLegacyPreservation')
)
$ErrorActionPreference = 'Stop'
if (!(Test-Path (Join-Path $LegacyPath '.git'))) { throw "Not a git checkout: $LegacyPath" }
$remote = (& git -C $LegacyPath remote get-url origin).Trim()
if ($LASTEXITCODE -ne 0 -or $remote -notmatch 'github\.com[:/]JoseAngelValadezBarajas/Forge(?:\.git)?$') {
  throw "Unexpected legacy remote: $remote"
}
& git -C $LegacyPath fetch origin --prune --tags
if ($LASTEXITCODE -ne 0) { throw 'Legacy fetch failed' }
$mainSha = (& git -C $LegacyPath rev-parse origin/main).Trim()
$draftSha = (& git -C $LegacyPath ls-remote origin 'refs/heads/feature/ui-rfx-01-design-system')
if ($LASTEXITCODE -ne 0 -or !$draftSha) { throw 'Missing original UI-RFX-01 branch; stop and investigate before archiving.' }
$draftSha = ($draftSha -split '\s+')[0]
New-Item -ItemType Directory -Force -Path $BackupDirectory | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$bundle = Join-Path $BackupDirectory "Forge-legacy-$stamp.bundle"
& git -C $LegacyPath bundle create $bundle --all
if ($LASTEXITCODE -ne 0) { throw 'Bundle creation failed' }
& git -C $LegacyPath bundle verify $bundle
if ($LASTEXITCODE -ne 0) { throw 'Bundle verification failed' }
$sha = (Get-FileHash -Algorithm SHA256 $bundle).Hash.ToLowerInvariant()
$record = [ordered]@{ source_repository = 'JoseAngelValadezBarajas/Forge'; main_sha = $mainSha; ui_rfx_01_branch_sha = $draftSha; draft_pr = 30; created_at = (Get-Date).ToString('o'); bundle_file = $bundle; bundle_sha256 = $sha; bundle_verified = $true; data_backup = 'SEPARATE_LOCAL_ONLY_NOT_INCLUDED' }
$manifest = Join-Path $BackupDirectory "Forge-legacy-$stamp-manifest.json"
$record | ConvertTo-Json | Set-Content -Path $manifest -Encoding utf8
Write-Host "Preserved Git bundle: $bundle"
Write-Host "Verified manifest: $manifest"
Write-Host 'IMPORTANT: local SQLite data/attachments need their own offline backup, not included in git bundle.'
Write-Host 'IMPORTANT: archive Forge only after public new repo, PR #30 preservation, data recovery and user sign-off.'
