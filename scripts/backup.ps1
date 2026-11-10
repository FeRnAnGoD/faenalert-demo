$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path $PSScriptRoot -Parent
$backupDirectory = Join-Path $repositoryRoot 'backups'
$temporaryName = 'faenalert-backup-' + [guid]::NewGuid().ToString('N') + '.dump'
$containerDumpPath = '/tmp/' + $temporaryName
$containerId = ''

Push-Location $repositoryRoot
try {
 $containerId = (& docker compose ps -q db).Trim()
 if ($LASTEXITCODE -ne 0 -or -not $containerId) { throw 'Start the local PostgreSQL service before creating a backup.' }

 $databaseUser = (& docker exec $containerId printenv POSTGRES_USER).Trim()
 if ($LASTEXITCODE -ne 0 -or -not $databaseUser) { throw 'Could not read the PostgreSQL container user.' }
 $databaseName = (& docker exec $containerId printenv POSTGRES_DB).Trim()
 if ($LASTEXITCODE -ne 0 -or -not $databaseName) { throw 'Could not read the PostgreSQL container database name.' }

 $ready = & docker exec $containerId pg_isready -U $databaseUser -d $databaseName
 if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL is not ready for a backup.' }

 New-Item -ItemType Directory -Force -Path $backupDirectory | Out-Null
 $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
 $backupPath = Join-Path $backupDirectory ('faenalert-' + $stamp + '-' + [guid]::NewGuid().ToString('N') + '.dump')
 $null = & docker exec $containerId pg_dump -U $databaseUser -d $databaseName -Fc -f $containerDumpPath
 if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed.' }

 $null = & docker exec $containerId pg_restore --list $containerDumpPath
 if ($LASTEXITCODE -ne 0) { throw 'The generated backup is not a readable PostgreSQL archive.' }
 $null = & docker cp ($containerId + ':' + $containerDumpPath) $backupPath
 if ($LASTEXITCODE -ne 0) { throw 'Could not copy the backup to the local backups directory.' }
 $backupFile = Get-Item -LiteralPath $backupPath
 if ($backupFile.Length -eq 0) { throw 'The generated backup file is empty.' }

 $checksum = (Get-FileHash -LiteralPath $backupPath -Algorithm SHA256).Hash
 Write-Output "Backup: $backupPath"
 Write-Output "Size: $($backupFile.Length) bytes"
 Write-Output "SHA-256: $checksum"
}
finally {
 if ($containerId) {
  $null = & docker exec $containerId rm -f $containerDumpPath
  if ($LASTEXITCODE -ne 0) { Write-Warning 'Could not remove the temporary dump from the PostgreSQL container.' }
 }
 Pop-Location
}
