$pgBin = "C:\Users\kacone\AppData\Local\Programs\pgsql17\bin"

Write-Host "=== Executing Superuser Provisioning on localhost:5432 ==="
& "$pgBin\psql.exe" -U postgres -h localhost -p 5432 -d postgres -c "
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'postgres') THEN
    CREATE ROLE postgres SUPERUSER LOGIN PASSWORD 'postgres';
  ELSE
    ALTER ROLE postgres WITH SUPERUSER LOGIN PASSWORD 'postgres';
  END IF;
END
\$\$;
"

& "$pgBin\psql.exe" -U postgres -h localhost -p 5432 -d postgres -c "
SELECT 'CREATE DATABASE pickem_rehearsal OWNER postgres'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pickem_rehearsal')\gexec
"

& "$pgBin\psql.exe" -U postgres -h localhost -p 5432 -d postgres -c "
ALTER DATABASE pickem_rehearsal SET timezone = 'UTC';
ALTER DATABASE pickem_rehearsal SET app.disposable = 'true';
"

Write-Host "`n=== Bootstrapping Roles on pickem_rehearsal ==="
& "$pgBin\psql.exe" -U postgres -h localhost -p 5432 -d pickem_rehearsal -c "
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END
\$\$;
"

Write-Host "`n=== Running Identity Query on pickem_rehearsal ==="
& "$pgBin\psql.exe" -U postgres -h localhost -p 5432 -d pickem_rehearsal -c "
SELECT current_database(), current_setting('app.disposable', true) AS disposable_sentinel, inet_server_addr(), inet_server_port(), version();
SHOW timezone;
"
