param([switch]$Local)

$envFile = Join-Path $PSScriptRoot ".env.bridge"
if (-not (Test-Path $envFile)) {
    Write-Host "Missing .env.bridge. Copy .env.bridge.example to .env.bridge and fill it in." -ForegroundColor Red
    exit 1
}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.+?)\s*$') { Set-Item "Env:$($Matches[1])" $Matches[2] }
}
if ($Local) { $env:API_URL = "http://localhost:3000/api/v1" }

foreach ($name in "SSL_CERT_FILE", "REQUESTS_CA_BUNDLE", "CURL_CA_BUNDLE") {
    Remove-Item "Env:$name" -ErrorAction SilentlyContinue
}

Set-Location $PSScriptRoot
Write-Host "Card bridge -> $env:API_URL" -ForegroundColor Cyan

while ($true) {
    python card_bridge.py
    Write-Host "Bridge stopped. Restarting in 3 seconds (Ctrl+C to quit)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}