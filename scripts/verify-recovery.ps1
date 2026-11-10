$ErrorActionPreference = 'Stop'
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
 docker compose stop db
 if($LASTEXITCODE -ne 0){ throw 'Could not stop test database service' }
 try {
  $live = Invoke-WebRequest 'http://127.0.0.1:8080/api/v1/health/live' -TimeoutSec 10 -SkipHttpErrorCheck
  $ready = Invoke-WebRequest 'http://127.0.0.1:8080/api/v1/health/ready' -TimeoutSec 10 -SkipHttpErrorCheck
  if($live.StatusCode -ne 200 -or $ready.StatusCode -ne 503){ throw "Unexpected outage response: live=$($live.StatusCode), ready=$($ready.StatusCode)" }
  Write-Output 'Database outage: liveness 200 and readiness 503 confirmed.'
 } finally {
  docker compose up -d --wait db
  if($LASTEXITCODE -ne 0){throw 'Could not restart database'}
 }
 $response = Invoke-WebRequest 'http://127.0.0.1:8080/api/v1/health/ready' -TimeoutSec 15
 if($response.StatusCode -ne 200){throw 'API did not recover'}
 Write-Output 'API reconnected to PostgreSQL without process restart.'
} finally { Pop-Location }
