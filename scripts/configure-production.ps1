# Configura o .env de produção no Windows quando o Bash não está disponível.
# A rotação de senha de um PostgreSQL já em execução continua no setup.sh (Git Bash/WSL).
param(
    [string]$Domain = '',
    [string]$BindAddress = '',
    [string]$Port = '',
    [switch]$Yes,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Show-Help {
    @'
Configura o .env de producao do PDL PRO (Windows).

Uso:
  .\scripts\configure-production.ps1 -Domain seudominio.com -Yes

Opcoes:
  -Domain DOMINIO       Dominio publico HTTPS
  -BindAddress IP       IP HTTP interno (padrao: 0.0.0.0)
  -Port PORTA           Porta do proxy interno (padrao: 8080)
  -Yes                  Nao solicita confirmacao
  -Help                 Ajuda

Variaveis: PDL_ENV_FILE, PDL_CONFIG_BACKUP_DIR, PDL_SKIP_DOCKER
'@
}

if ($Help) {
    Show-Help
    exit 0
}

$RootDir = Split-Path -Parent $PSScriptRoot
$EnvFile = if ($env:PDL_ENV_FILE) { $env:PDL_ENV_FILE } else { Join-Path $RootDir '.env' }
$ExampleFile = Join-Path $RootDir '.env.example'

function Read-EnvValue {
    param([string]$Key, [string]$Path = $EnvFile)
    if (-not (Test-Path -LiteralPath $Path)) { return '' }
    foreach ($line in Get-Content -LiteralPath $Path) {
        $clean = $line.TrimEnd("`r")
        if ($clean.StartsWith("$Key=")) {
            return $clean.Substring($Key.Length + 1)
        }
    }
    return ''
}

function Set-EnvValue {
    param([string]$Key, [string]$Value)
    $lines = @()
    $updated = $false
    if (Test-Path -LiteralPath $EnvFile) {
        foreach ($line in Get-Content -LiteralPath $EnvFile) {
            $clean = $line.TrimEnd("`r")
            if ($clean.StartsWith("$Key=")) {
                if (-not $updated) {
                    $lines += "$Key=$Value"
                    $updated = $true
                }
                continue
            }
            $lines += $clean
        }
    }
    if (-not $updated) {
        $lines += "$Key=$Value"
    }
    $utf8 = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllLines($EnvFile, $lines, $utf8)
}

function Test-WeakValue {
    param([string]$Value, [int]$MinimumLength)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $true }
    if ($Value.Length -lt $MinimumLength) { return $true }
    if ($Value.StartsWith('change-me-')) { return $true }
    if ($Value -eq 'pdl') { return $true }
    if ($Value -match '\s') { return $true }
    return $false
}

function New-FernetKey {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return [Convert]::ToBase64String($bytes).Replace('+','-').Replace('/','_')
}

function New-HexSecret {
    param([int]$ByteCount)
    $bytes = New-Object byte[] $ByteCount
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($bytes)
    }
    finally {
        $rng.Dispose()
    }
    return ([System.BitConverter]::ToString($bytes) -replace '-', '').ToLowerInvariant()
}

if (-not (Test-Path -LiteralPath $EnvFile)) {
    if (-not (Test-Path -LiteralPath $ExampleFile)) {
        throw '.env e .env.example nao foram encontrados'
    }
    Copy-Item -LiteralPath $ExampleFile -Destination $EnvFile
}

if (-not $Domain) { $Domain = Read-EnvValue 'DOMAIN' }
if (-not $Domain) { $Domain = 'pdl.denky.dev.br' }
if (-not $BindAddress) { $BindAddress = Read-EnvValue 'APP_BIND_ADDRESS' }
if (-not $BindAddress) { $BindAddress = '0.0.0.0' }
if (-not $Port) { $Port = Read-EnvValue 'APP_HTTP_PORT' }
if (-not $Port) { $Port = '8080' }

if ($Domain -notmatch '^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$') {
    throw "dominio invalido: $Domain"
}
if ($BindAddress -notmatch '^[0-9]{1,3}(\.[0-9]{1,3}){3}$') {
    throw "IP de bind invalido: $BindAddress"
}
$portNumber = 0
if (-not [int]::TryParse($Port, [ref]$portNumber) -or $portNumber -lt 1 -or $portNumber -gt 65535) {
    throw "porta invalida: $Port"
}

$secret = Read-EnvValue 'SECRET_KEY'
$password = Read-EnvValue 'DB_PASSWORD'
$redisPassword = Read-EnvValue 'REDIS_PASSWORD'
$dbUser = Read-EnvValue 'DB_USER'
if (-not $dbUser) { $dbUser = 'pdl' }
$dbName = Read-EnvValue 'DB_NAME'
if (-not $dbName) { $dbName = 'pdl' }

if (Test-WeakValue $secret 50) { $secret = New-HexSecret 64 }
if (Test-WeakValue $password 16) { $password = New-HexSecret 32 }
# O Compose de producao exige REDIS_PASSWORD e monta REDIS_URL com ela.
if (Test-WeakValue $redisPassword 16) { $redisPassword = New-HexSecret 24 }
$dataKey = Read-EnvValue 'PDL_DATA_ENCRYPTION_KEY'
$backupKey = Read-EnvValue 'BACKUP_ENCRYPTION_KEY'
if (Test-WeakValue $dataKey 32) { $dataKey = New-FernetKey }
if (Test-WeakValue $backupKey 32) { $backupKey = New-HexSecret 32 }

if (-not $Yes) {
    throw 'execucao nao interativa exige -Yes'
}

$backupDir = if ($env:PDL_CONFIG_BACKUP_DIR) { $env:PDL_CONFIG_BACKUP_DIR } else { Join-Path $RootDir 'backups\config' }
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$stamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')
$backupPath = Join-Path $backupDir "env.$stamp.backup"
Copy-Item -LiteralPath $EnvFile -Destination $backupPath

Set-EnvValue 'DEBUG' 'false'
Set-EnvValue 'SECRET_KEY' $secret
Set-EnvValue 'PDL_DATA_ENCRYPTION_KEY' $dataKey
Set-EnvValue 'BACKUP_ENCRYPTION_KEY' $backupKey
Set-EnvValue 'DJANGO_SETTINGS_MODULE' 'core.settings.production'
Set-EnvValue 'ALLOWED_HOSTS' $Domain
Set-EnvValue 'CORS_ALLOWED_ORIGINS' "https://$Domain"
Set-EnvValue 'CSRF_TRUSTED_ORIGINS' "https://$Domain"
Set-EnvValue 'OPENAPI_DOCS_PUBLIC' 'false'
Set-EnvValue 'DB_NAME' $dbName
Set-EnvValue 'DB_USER' $dbUser
Set-EnvValue 'DB_PASSWORD' $password
Set-EnvValue 'DATABASE_URL' "postgres://${dbUser}:${password}@db:5432/${dbName}"
Set-EnvValue 'REDIS_PASSWORD' $redisPassword
Set-EnvValue 'REDIS_URL' "redis://:${redisPassword}@redis:6379/0"
Set-EnvValue 'DOMAIN' $Domain
Set-EnvValue 'APP_BIND_ADDRESS' $BindAddress
Set-EnvValue 'APP_HTTP_PORT' "$portNumber"
Set-EnvValue 'PROJECT_URL' "https://$Domain"
Set-EnvValue 'FRONTEND_URL' "https://$Domain"
Set-EnvValue 'PAYMENT_WEBHOOK_BASE_URL' "https://$Domain"
Set-EnvValue 'WEBAUTHN_RP_ID' $Domain
Set-EnvValue 'WEBAUTHN_ORIGINS' "https://$Domain"
Set-EnvValue 'VAPID_SUBJECT' "mailto:noreply@$Domain"
Set-EnvValue 'DEFAULT_FROM_EMAIL' "noreply@$Domain"
Set-EnvValue 'GUNICORN_RELOAD' 'false'
Set-EnvValue 'RUN_MIGRATIONS' 'true'
Set-EnvValue 'RUN_COLLECTSTATIC' 'true'
Set-EnvValue 'PAYMENT_ALLOW_MOCK' 'false'
Set-EnvValue 'PAYMENT_MOCK_AUTO_CONFIRM' 'false'

Write-Host "[OK] Configuracao de producao salva em $EnvFile"
Write-Host "[INFO] Backup anterior: $backupPath"
Write-Host "[INFO] Proximo passo: docker compose --env-file .env -f docker-compose.prod.yml up -d"
