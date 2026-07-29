# ReelShift — build a clean Microsoft Edge Add-ons package (.zip).
# Run from anywhere: powershell -File scripts/package-extension.ps1

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$manifestPath = Join-Path $root "manifest.json"

if (-not (Test-Path $manifestPath)) {
  throw "manifest.json not found at $root"
}

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$version = $manifest.version
if (-not $version) {
  throw "manifest.json is missing version"
}

$zipName = "reelshift-$version.zip"
$zipPath = Join-Path $root $zipName
$staging = Join-Path $root "dist\reelshift-$version"

$includeDirs = @(
  "background",
  "shared",
  "content",
  "popup",
  "options",
  "assets",
  "_locales",
  "privacy"
)

$includeFiles = @(
  "manifest.json",
  "README.md"
)

if (Test-Path $staging) {
  Remove-Item $staging -Recurse -Force
}
New-Item -ItemType Directory -Path $staging -Force | Out-Null

foreach ($file in $includeFiles) {
  Copy-Item (Join-Path $root $file) (Join-Path $staging $file)
}

foreach ($dir in $includeDirs) {
  $source = Join-Path $root $dir
  if (-not (Test-Path $source)) {
    throw "Required folder missing: $dir"
  }
  Copy-Item $source (Join-Path $staging $dir) -Recurse
}

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $zipPath -Force
Remove-Item (Split-Path $staging -Parent) -Recurse -Force

Write-Host ""
Write-Host "ReelShift package created:" -ForegroundColor Green
Write-Host "  $zipPath"
Write-Host ""
Write-Host "Included at zip root:"
Get-ChildItem $zipPath | ForEach-Object { Write-Host "  (archive root) $_" }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
$archive.Entries | Select-Object -First 20 | ForEach-Object { Write-Host "  $($_.FullName)" }
if ($archive.Entries.Count -gt 20) {
  Write-Host "  ... and $($archive.Entries.Count - 20) more entries"
}
$archive.Dispose()
Write-Host ""
Write-Host "Excluded: tests/, store/, scripts/, .git/, .cursor/, node_modules/, *.zip"
Write-Host "Before upload: complete store/CONFIGURE_BEFORE_PUBLISH.md"
