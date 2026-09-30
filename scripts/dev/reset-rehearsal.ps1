# reset-rehearsal.ps1 - Mandatory Rehearsal Clean Rebuild (R-12.2-O §1)
$ErrorActionPreference = "Stop"

$LocalRehearsalUrl = if ($env:TEST_DATABASE_URL) { $env:TEST_DATABASE_URL } elseif ($env:DATABASE_URL) { $env:DATABASE_URL } else { "postgresql://postgres:postgres@localhost:5432/pickem_rehearsal" }

Write-Host "=== RESET REHEARSAL DATABASE (Decision #35) ===" -ForegroundColor Cyan

# 1. Assert Disposable URL
if ($LocalRehearsalUrl -match '\?schema=') {
    Write-Error "CRITICAL: Schema parameter found in DATABASE_URL ($LocalRehearsalUrl). Connection aborted."
    exit 1
}
if ($LocalRehearsalUrl -notmatch 'localhost' -and $LocalRehearsalUrl -notmatch '127\.0\.0\.1') {
    Write-Error "CRITICAL: Database host is not localhost/127.0.0.1 ($LocalRehearsalUrl). Aborted."
    exit 1
}
if ($LocalRehearsalUrl -notmatch 'pickem_(rehearsal|test)') {
    Write-Error "CRITICAL: Database name is not pickem_rehearsal or pickem_test ($LocalRehearsalUrl). Aborted."
    exit 1
}
Write-Host "✅ URL Safety verified (localhost, no schema, pickem_rehearsal)." -ForegroundColor Green

# 2. Re-run with node script
& npx tsx "$PSScriptRoot/reset-rehearsal.mjs"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Reset script failed."
    exit 1
}
