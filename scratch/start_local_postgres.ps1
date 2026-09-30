$pgBin = "C:\Users\kacone\AppData\Local\Programs\pgsql17\bin"
$pgData = "C:\Users\kacone\AppData\Local\Programs\pgsql17\data"

if (!(Test-Path $pgData)) {
  Write-Host "Initializing PostgreSQL 17 cluster..."
  & "$pgBin\initdb.exe" -U postgres -A trust -E UTF8 --locale=C -D $pgData
}

Write-Host "Starting PostgreSQL 17 server on port 5432..."
& "$pgBin\pg_ctl.exe" -D $pgData -l "$pgData\logfile.txt" -o "-p 5432 -c listen_addresses=localhost" start
Start-Sleep -Seconds 3

& "$pgBin\pg_isready.exe" -h localhost -p 5432
