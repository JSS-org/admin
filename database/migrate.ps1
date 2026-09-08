param(
    [string]$HostName = '127.0.0.1',
    [int]$Port = 5432,
    [string]$Username = 'postgres',
    [string]$Database = 'jss_admin_dev',
    [string]$Psql = 'psql',
    [switch]$SeedDevelopment
)
$ErrorActionPreference = 'Stop'
$connection = @('-X', '-h', $HostName, '-p', "$Port", '-U', $Username, '-d', $Database, '-v', 'ON_ERROR_STOP=1')
$hasVersions = & $Psql @connection -Atc "SELECT to_regclass('public.schema_migrations') IS NOT NULL"
if ($LASTEXITCODE -ne 0) { throw 'Database connection failed.' }
$applied = @()
if ($hasVersions -eq 't') {
    $applied = @(& $Psql @connection -Atc 'SELECT version FROM schema_migrations ORDER BY version')
    if ($LASTEXITCODE -ne 0) { throw 'Unable to read applied migrations.' }
}
foreach ($migration in Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'migrations') -Filter '*.sql' | Sort-Object Name) {
    $version = [int]($migration.Name.Split('-')[0])
    if ("$version" -notin $applied) {
        Write-Output "Applying $($migration.Name)"
        & $Psql @connection -f $migration.FullName
        if ($LASTEXITCODE -ne 0) { throw "Migration failed: $($migration.Name)" }
    }
}
& $Psql @connection -q -f (Join-Path $PSScriptRoot 'seeds/001-permissions.sql')
if ($LASTEXITCODE -ne 0) { throw 'Permission initialization failed.' }
if ($SeedDevelopment) {
    & $Psql @connection -q -f (Join-Path $PSScriptRoot 'seeds/002-development.sql')
    if ($LASTEXITCODE -ne 0) { throw 'Development seed failed.' }
}
Write-Output 'Database is ready.'
