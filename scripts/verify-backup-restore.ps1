param(
 [string]$BackupPath,
 [switch]$CompareCurrent
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path $PSScriptRoot -Parent
$databaseName = 'faenalert_restore_verify_' + [guid]::NewGuid().ToString('N')
$dumpName = 'faenalert-restore-verify-' + [guid]::NewGuid().ToString('N') + '.dump'
$containerDumpPath = '/tmp/' + $dumpName
$generatedDump = [string]::IsNullOrWhiteSpace($BackupPath)
$compareToCurrent = $generatedDump -or $CompareCurrent.IsPresent
$localDumpPath = if ($generatedDump) {
 Join-Path $repositoryRoot (Join-Path 'tmp' $dumpName)
} else {
 (Resolve-Path -LiteralPath $BackupPath).Path
}
$databaseCreated = $false
$containerId = ''

function Invoke-ContainerPsql {
 param([string]$Container, [string]$User, [string]$Database, [string]$Sql)
 $result = & docker exec $Container psql -U $User -d $Database -A -t -F "`t" -c $Sql
 if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL query failed during restore verification.' }
 return $result
}

function Get-PublicTableCounts {
 param([string]$Container, [string]$User, [string]$Database)
 $tableRows = Invoke-ContainerPsql $Container $User $Database "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
 $counts = [ordered]@{}
 foreach ($tableRow in @($tableRows)) {
  $table = ([string]$tableRow).Trim()
  if (-not $table) { continue }
  $quotedTable = $table.Replace('"', '""')
  $countRow = Invoke-ContainerPsql $Container $User $Database ('SELECT count(*) FROM public."' + $quotedTable + '"')
  $counts[$table] = [int64](([string]$countRow).Trim())
 }
 return $counts
}

Push-Location $repositoryRoot
try {
 $containerId = (& docker compose ps -q db).Trim()
 if ($LASTEXITCODE -ne 0 -or -not $containerId) { throw 'Start the local PostgreSQL service before verifying its backup.' }

 $databaseUser = (& docker exec $containerId printenv POSTGRES_USER).Trim()
 if ($LASTEXITCODE -ne 0 -or -not $databaseUser) { throw 'Could not read the PostgreSQL container user.' }
 $sourceDatabase = (& docker exec $containerId printenv POSTGRES_DB).Trim()
 if ($LASTEXITCODE -ne 0 -or -not $sourceDatabase) { throw 'Could not read the PostgreSQL container database name.' }

 $ready = & docker exec $containerId pg_isready -U $databaseUser -d $sourceDatabase
 if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL is not ready for a backup verification.' }

 $sourceCountsBefore = $null
 if ($compareToCurrent) {
  $sourceCountsBefore = Get-PublicTableCounts $containerId $databaseUser $sourceDatabase
  if ($sourceCountsBefore.Count -eq 0) { throw 'The source database has no public tables to verify.' }
 }

 if ($generatedDump) {
  New-Item -ItemType Directory -Force -Path (Split-Path $localDumpPath -Parent) | Out-Null
  $null = & docker exec $containerId pg_dump -U $databaseUser -d $sourceDatabase -Fc -f $containerDumpPath
  if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed while creating the temporary verification copy.' }
  $null = & docker cp ($containerId + ':' + $containerDumpPath) $localDumpPath
  if ($LASTEXITCODE -ne 0) { throw 'Could not copy the temporary backup from PostgreSQL.' }
 }
 if (-not (Test-Path -LiteralPath $localDumpPath) -or (Get-Item -LiteralPath $localDumpPath).Length -eq 0) {
  throw 'The backup file is missing or empty.'
 }

 if ($compareToCurrent) {
  $sourceCountsAfter = Get-PublicTableCounts $containerId $databaseUser $sourceDatabase
  foreach ($table in $sourceCountsBefore.Keys) {
   if (-not $sourceCountsAfter.Contains($table) -or $sourceCountsBefore[$table] -ne $sourceCountsAfter[$table]) {
    throw 'Source rows changed while the backup was being checked; retry when the demo is idle.'
   }
  }
 }

 $null = & docker exec $containerId createdb -U $databaseUser ('--owner=' + $databaseUser) $databaseName
 if ($LASTEXITCODE -ne 0) { throw 'Could not create the isolated restore database.' }
 $databaseCreated = $true

 $null = & docker cp $localDumpPath ($containerId + ':' + $containerDumpPath)
 if ($LASTEXITCODE -ne 0) { throw 'Could not copy the temporary backup into PostgreSQL.' }
 $null = & docker exec $containerId pg_restore --exit-on-error --no-owner --no-acl -U $databaseUser -d $databaseName $containerDumpPath
 if ($LASTEXITCODE -ne 0) { throw 'pg_restore failed in the isolated restore database.' }

 $restoredCounts = Get-PublicTableCounts $containerId $databaseUser $databaseName
 $requiredTables = @('sites', 'users', 'site_access', 'meetings', 'minutes', 'actions', 'audit_events')
 foreach ($table in $requiredTables) {
  if (-not $restoredCounts.Contains($table)) { throw "Required table '$table' is missing from the restored backup." }
 }
 if ($compareToCurrent) {
  if ($restoredCounts.Count -ne $sourceCountsBefore.Count) { throw 'The restored database has a different number of public tables.' }
  foreach ($table in $sourceCountsBefore.Keys) {
   if (-not $restoredCounts.Contains($table) -or $sourceCountsBefore[$table] -ne $restoredCounts[$table]) {
    throw "Restored row count does not match for table '$table'."
   }
  }
 }

 $checksum = (Get-FileHash -LiteralPath $localDumpPath -Algorithm SHA256).Hash
 Write-Output "Backup and restore verified: $($restoredCounts.Count) public tables; SHA-256 $checksum."
 Write-Output 'The temporary restore database and container copy are removed when the script exits; the demo database is unchanged.'
 if ($generatedDump) { Write-Output 'The generated local dump is removed when the script exits.' }
}
finally {
 if ($containerId) {
  if ($databaseCreated) {
   $null = & docker exec $containerId dropdb --if-exists --force -U $databaseUser $databaseName
   if ($LASTEXITCODE -ne 0) { Write-Warning 'Could not remove the temporary restore database.' }
  }
  $null = & docker exec $containerId rm -f $containerDumpPath
 }
 if ($generatedDump -and (Test-Path -LiteralPath $localDumpPath)) { Remove-Item -LiteralPath $localDumpPath -Force }
 Pop-Location
}
