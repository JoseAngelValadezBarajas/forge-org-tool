# Deliberately separate irreversible workflow. Operator must review evidence.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$VerifiedPreservationManifest,
  [switch]$ApproveArchive
)
$ErrorActionPreference = 'Stop'
if (!$ApproveArchive) { throw 'You must explicitly pass -ApproveArchive after reviewing all evidence.' }
if (!(Test-Path $VerifiedPreservationManifest)) { throw 'Preservation manifest not found.' }
$evidence = Get-Content -Raw $VerifiedPreservationManifest | ConvertFrom-Json
if ($evidence.bundle_verified -ne $true -or !$evidence.main_sha -or !$evidence.ui_rfx_01_branch_sha -or !$evidence.bundle_file -or !$evidence.bundle_sha256) {
  throw 'Missing preservation evidence. Never archive without verified main/PR #30 refs.'
}
if (!(Test-Path $evidence.bundle_file)) { throw 'Preserved git bundle file is missing.' }
$actualHash = (Get-FileHash -Algorithm SHA256 $evidence.bundle_file).Hash.ToLowerInvariant()
if ($actualHash -ne $evidence.bundle_sha256) { throw 'Preserved git bundle hash does not match manifest.' }
if (!(Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git is required' }
& git bundle verify $evidence.bundle_file
if ($LASTEXITCODE -ne 0) { throw 'Preserved git bundle verification failed.' }
if (!(Get-Command gh -ErrorAction SilentlyContinue)) { throw 'GitHub CLI is required' }
& gh repo view JoseAngelValadezBarajas/forge-org-tool *> $null
if ($LASTEXITCODE -ne 0) { throw 'New public repo is not accessible.' }
Write-Warning 'Archiving Forge will make the legacy repo READ ONLY, including open Draft PR #30. Ensure backup, data migration and rollback decisions are signed off.'
$confirm = Read-Host 'To archive the ORIGINAL repo, type exactly ARCHIVE JoseAngelValadezBarajas/Forge'
if ($confirm -cne 'ARCHIVE JoseAngelValadezBarajas/Forge') { throw 'Archive cancelled' }
& gh repo archive JoseAngelValadezBarajas/Forge --yes
if ($LASTEXITCODE -ne 0) { throw 'Archive command failed' }
