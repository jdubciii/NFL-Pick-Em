# diff-allowlist-check.ps1 - Decision #39, #47 / R-12.2-U §1.B
$ErrorActionPreference = "Stop"
& npx tsx "$PSScriptRoot/diff-allowlist-check.mjs" $args
