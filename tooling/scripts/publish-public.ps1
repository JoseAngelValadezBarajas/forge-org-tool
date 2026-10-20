# Run from the new scaffold root, after explicit inspection and local quality checks.
[CmdletBinding()]
param([string]$Owner = 'JoseAngelValadezBarajas', [string]$RepoName = 'forge-org-tool')
$ErrorActionPreference = 'Stop'
if (!(Get-Command gh -ErrorAction SilentlyContinue)) { throw 'GitHub CLI gh not installed' }
if (!(Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git not installed' }
if (!(Test-Path 'package-lock.json') -or !(Test-Path 'apps/api/uv.lock')) {
  throw 'First create and commit npm and uv lockfiles. See README.md.'
}
if (!(Test-Path '.git')) { throw 'First run git init -b main, git add after security review, and git commit.' }
$branch = (& git branch --show-current).Trim()
if ($branch -ne 'main') { throw "Expected main branch, got $branch" }
$dirty = & git status --porcelain
if ($dirty) { throw 'Working tree not clean. Review and commit intentional changes first.' }
& gh repo view "$Owner/$RepoName" *> $null
if ($LASTEXITCODE -eq 0) { throw 'Repository already exists: do not overwrite or attempt to create twice.' }
Write-Host "Preparing to create PUBLIC GitHub repository $Owner/$RepoName."
$answer = Read-Host 'Confirm all changes reviewed for secrets and personal data. Type PUBLIC'
if ($answer -cne 'PUBLIC') { throw 'Publication cancelled' }
& gh repo create "$Owner/$RepoName" --public --source . --remote origin --push --description 'Local-first work organization and engineering delivery traceability'
if ($LASTEXITCODE -ne 0) { throw 'Public repository creation failed; check GitHub before retrying.' }
Write-Host 'Now clone into a clean directory and verify main and CI. Do not archive the original until the preservation gate passes.'
