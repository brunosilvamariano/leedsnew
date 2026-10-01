$ErrorActionPreference = "Stop"
$projectDirectory = Split-Path -Parent $PSScriptRoot
Set-Location $projectDirectory

$modelLine = Get-Content .env -ErrorAction SilentlyContinue |
  Where-Object { $_ -match '^OLLAMA_MODEL=' } |
  Select-Object -Last 1
$model = if ($modelLine) {
  (($modelLine -split '=', 2)[1]).Trim().Trim('"')
} else {
  "qwen3:1.7b"
}

Write-Host "Iniciando Ollama..." -ForegroundColor Cyan
docker compose up -d ollama

Write-Host "Baixando o modelo $model. Isso acontece somente na primeira execução..." -ForegroundColor Cyan
docker compose exec ollama ollama pull $model

Write-Host "Testando a IA local..." -ForegroundColor Cyan
$payload = @{
  model = $model
  prompt = "/no_think Responda apenas: IA local do BizPeek funcionando."
  stream = $false
} | ConvertTo-Json -Compress
$response = Invoke-RestMethod -Uri "http://localhost:11434/api/generate" -Method Post -ContentType "application/json" -Body $payload -TimeoutSec 180

Write-Host $response.response.Trim() -ForegroundColor Green
Write-Host "Ollama pronto em http://localhost:11434 usando $model." -ForegroundColor Green
