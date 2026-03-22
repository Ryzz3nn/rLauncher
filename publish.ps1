# rLauncher Publish Script
# Run in Administrator PowerShell from the project root
# Usage: .\publish.ps1 [version]
# Example: .\publish.ps1 0.3.0

param(
    [string]$Version
)

$ErrorActionPreference = "Stop"

# Get current version from package.json if not provided
if (-not $Version) {
    $pkg = Get-Content package.json | ConvertFrom-Json
    $currentVersion = $pkg.version
    $Version = Read-Host "Enter new version (current: $currentVersion)"
    if (-not $Version) {
        Write-Host "No version provided, aborting." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "=== rLauncher Publish v$Version ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Update version in package.json
Write-Host "[1/6] Updating version to $Version..." -ForegroundColor Yellow
$pkg = Get-Content package.json -Raw
$pkg = $pkg -replace '"version":\s*"[^"]*"', "`"version`": `"$Version`""
$pkg | Set-Content package.json -NoNewline
Write-Host "  Done." -ForegroundColor Green

# Step 2: Clean winCodeSign cache (avoids symlink errors)
Write-Host "[2/6] Cleaning winCodeSign cache..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign" -ErrorAction SilentlyContinue
Write-Host "  Done." -ForegroundColor Green

# Step 3: Build
Write-Host "[3/6] Building..." -ForegroundColor Yellow
npm run dist:win
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Build complete." -ForegroundColor Green

# Step 4: Verify output files exist
Write-Host "[4/6] Verifying build output..." -ForegroundColor Yellow
$installer = "release\rLauncher Setup $Version.exe"
$portable = "release\rLauncher-$Version-portable.exe"
$latest = "release\latest.yml"

$files = @()
if (Test-Path $installer) { $files += $installer; Write-Host "  Found: $installer" -ForegroundColor Green }
else { Write-Host "  Missing: $installer" -ForegroundColor Red }

if (Test-Path $portable) { $files += $portable; Write-Host "  Found: $portable" -ForegroundColor Green }
else { Write-Host "  Missing: $portable" -ForegroundColor Red }

if (Test-Path $latest) { $files += $latest; Write-Host "  Found: $latest" -ForegroundColor Green }
else { Write-Host "  Missing: $latest (auto-update won't work!)" -ForegroundColor Red }

if ($files.Count -lt 2) {
    Write-Host "Not enough build artifacts found, aborting." -ForegroundColor Red
    exit 1
}

# Step 5: Git commit and push
Write-Host "[5/6] Committing and pushing..." -ForegroundColor Yellow
git add package.json package-lock.json
git commit -m "Release v$Version"
git push
Write-Host "  Pushed to GitHub." -ForegroundColor Green

# Step 6: Create GitHub Release
Write-Host "[6/6] Creating GitHub Release v$Version..." -ForegroundColor Yellow
$releaseNotes = Read-Host "Release notes (or press Enter for default)"
if (-not $releaseNotes) { $releaseNotes = "rLauncher v$Version" }

gh release create "v$Version" @files --title "v$Version" --notes $releaseNotes

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== Published rLauncher v$Version ===" -ForegroundColor Green
    Write-Host "Installed copies will auto-update on next launch." -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "GitHub release creation failed." -ForegroundColor Red
    exit 1
}
