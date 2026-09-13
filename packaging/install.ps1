# Instalador público da versão publicada do PDL PRO (Windows + Docker Desktop).
#Requires -Version 5.1
param(
    [string]$Version = 'latest',
    [string]$InstallDir = '',
    [string]$Domain = '',
    [string]$BindAddress = '0.0.0.0',
    [int]$Port = 8080,
    [switch]$Yes,
    [switch]$NoStart,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$DefaultRepo = if ($env:PDL_GITHUB_REPO) { $env:PDL_GITHUB_REPO } else { 'D3NKYT0/pdlpro' }
$DefaultRegistry = if ($env:PDL_IMAGE_REGISTRY) { $env:PDL_IMAGE_REGISTRY } else { 'ghcr.io/d3nkyt0/pdlpro' }

function Show-Help {
    @'
Instala uma versao publicada do PDL PRO (imagens Docker + Compose).

Uso:
  .\install.ps1 -Domain painel.exemplo.com -Yes

Opcoes:
  -Version X.Y.Z      Versao (padrao: latest da GitHub Release)
  -InstallDir PASTA   Destino (padrao: %LOCALAPPDATA%\PDL\PRO)
  -Domain DOMINIO     Dominio publico HTTPS (obrigatorio com -Yes)
  -BindAddress IP     IP do proxy interno (padrao: 0.0.0.0)
  -Port PORTA         Porta HTTP interna (padrao: 8080)
  -NoStart            So baixa, extrai e configura o .env
  -Yes                Nao pergunta confirmacao
  -Help               Ajuda

Variaveis: PDL_GITHUB_REPO, PDL_IMAGE_REGISTRY, PDL_RELEASE_BUNDLE,
PDL_RELEASE_API_URL, PDL_SKIP_DOCKER, PDL_SKIP_CHECKSUM, PDL_INSTALL_DRY_RUN
'@
}

if ($Help) {
    Show-Help
    exit 0
}

function Get-NormalizedVersion {
    param([string]$Value)
    if ($Value -eq 'latest') { return 'latest' }
    $clean = $Value.Trim()
    if ($clean -match '^[vV]\d') { $clean = $clean.Substring(1) }
    if ($clean -notmatch '^\d+\.\d+\.\d+([-+][A-Za-z0-9.-]+)?$') {
        throw "versao invalida: $Value"
    }
    return $clean
}

function Resolve-LocalSource {
    param([string]$Url)
    if ($Url.StartsWith('file://')) { return $Url.Substring(7) }
    if (Test-Path -LiteralPath $Url) { return $Url }
    return $null
}

function Get-RemoteText {
    param([string]$Url)
    $local = Resolve-LocalSource $Url
    if ($local) {
        return Get-Content -LiteralPath $local -Raw
    }
    return (Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 120).Content
}

function Save-RemoteFile {
    param([string]$Url, [string]$Destination)
    $directory = Split-Path -Parent $Destination
    if ($directory) {
        New-Item -ItemType Directory -Force -Path $directory | Out-Null
    }
    $local = Resolve-LocalSource $Url
    if ($local) {
        Copy-Item -LiteralPath $local -Destination $Destination -Force
        return
    }
    Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $Destination -TimeoutSec 180
}

function Resolve-PublishedVersion {
    param([string]$Requested)
    if ($Requested -ne 'latest') {
        return Get-NormalizedVersion $Requested
    }
    $api = if ($env:PDL_RELEASE_API_URL) {
        $env:PDL_RELEASE_API_URL
    }
    else {
        "https://api.github.com/repos/$DefaultRepo/releases/latest"
    }
    $payload = Get-RemoteText $api
    if ($payload -notmatch '"tag_name"\s*:\s*"([^"]+)"') {
        throw 'a API de releases nao devolveu tag_name'
    }
    return Get-NormalizedVersion $Matches[1]
}

function Get-DefaultInstallDir {
    if ($env:PDL_INSTALL_DIR) { return $env:PDL_INSTALL_DIR }
    $base = if ($env:LOCALAPPDATA) { $env:LOCALAPPDATA } else { $HOME }
    return Join-Path $base 'PDL\PRO'
}

function Find-GitBash {
    $candidates = @(
        (Join-Path ${env:ProgramFiles} 'Git\bin\bash.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Git\bin\bash.exe')
    )
    foreach ($path in $candidates) {
        if ($path -and (Test-Path -LiteralPath $path)) { return $path }
    }
    return $null
}

function Find-BundleRoot {
    param([string]$Extracted)
    $direct = Join-Path $Extracted 'setup.sh'
    if (Test-Path -LiteralPath $direct) { return $Extracted }
    $matches = Get-ChildItem -LiteralPath $Extracted -Directory -Filter 'pdl-pro-*' -ErrorAction SilentlyContinue
    foreach ($item in $matches) {
        if (Test-Path -LiteralPath (Join-Path $item.FullName 'setup.sh')) {
            return $item.FullName
        }
    }
    throw 'o ZIP extraido nao contem setup.sh'
}

function Copy-Bundle {
    param([string]$Source, [string]$Destination)
    New-Item -ItemType Directory -Force -Path $Destination | Out-Null
    $keepEnv = Join-Path $Destination '.env.install-keep'
    $existing = Join-Path $Destination '.env'
    if (Test-Path -LiteralPath $existing) {
        Copy-Item -LiteralPath $existing -Destination $keepEnv -Force
    }
    Copy-Item -Path (Join-Path $Source '*') -Destination $Destination -Recurse -Force
    if (Test-Path -LiteralPath $keepEnv) {
        Move-Item -LiteralPath $keepEnv -Destination $existing -Force
    }
}

function Set-PublishedImages {
    param([string]$Root, [string]$ResolvedVersion)
    $envFile = if ($env:PDL_ENV_FILE) { $env:PDL_ENV_FILE } else { Join-Path $Root '.env' }
    $pairs = @{
        PDL_IMAGE_REGISTRY     = $DefaultRegistry
        PDL_IMAGE_TAG          = $ResolvedVersion
        PDL_BACKEND_IMAGE      = "$DefaultRegistry/backend:$ResolvedVersion"
        PDL_WEB_IMAGE          = "$DefaultRegistry/web:$ResolvedVersion"
        PDL_IMAGE_PULL_POLICY  = 'always'
    }
    foreach ($key in $pairs.Keys) {
        $lines = @()
        $updated = $false
        if (Test-Path -LiteralPath $envFile) {
            foreach ($line in Get-Content -LiteralPath $envFile) {
                $clean = $line.TrimEnd("`r")
                if ($clean.StartsWith("$key=")) {
                    if (-not $updated) {
                        $lines += "$key=$($pairs[$key])"
                        $updated = $true
                    }
                    continue
                }
                $lines += $clean
            }
        }
        if (-not $updated) { $lines += "$key=$($pairs[$key])" }
        $utf8 = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllLines($envFile, $lines, $utf8)
    }
}

function Test-Domain {
    param([string]$Value)
    if (-not $Value) { throw 'informe -Domain (ex.: painel.exemplo.com)' }
    if ($Value -notmatch '^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$') {
        throw "dominio invalido: $Value"
    }
}

$resolved = Resolve-PublishedVersion $Version
if (-not $InstallDir) { $InstallDir = Get-DefaultInstallDir }
$bundleName = "pdl-pro-$resolved.zip"
$tag = "v$resolved"
$bundleUrl = if ($env:PDL_RELEASE_BUNDLE) {
    $env:PDL_RELEASE_BUNDLE
}
else {
    "https://github.com/$DefaultRepo/releases/download/$tag/$bundleName"
}

if ($env:PDL_INSTALL_DRY_RUN -eq '1') {
    Write-Output "version=$resolved"
    Write-Output "dir=$InstallDir"
    Write-Output "bundle=$bundleUrl"
    Write-Output "registry=$DefaultRegistry"
    if ($Domain) { Write-Output "domain=$Domain" }
    exit 0
}

if ($Yes) {
    Test-Domain $Domain
}
elseif (-not $Domain) {
    throw 'informe -Domain e -Yes em execucao nao interativa'
}

if ($env:PDL_SKIP_DOCKER -ne '1') {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw 'instale o Docker Desktop com Compose v2'
    }
    docker info | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'o Docker nao esta em execucao' }
    docker compose version | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Docker Compose v2 nao esta disponivel' }
}

if (-not $Yes) {
    throw 'execucao nao interativa exige -Yes'
}

$work = Join-Path ([System.IO.Path]::GetTempPath()) ("pdl-install-" + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $work | Out-Null
try {
    Write-Host "[INFO] Baixando $bundleName..."
    $zipPath = Join-Path $work $bundleName
    Save-RemoteFile $bundleUrl $zipPath
    $extracted = Join-Path $work 'extracted'
    Expand-Archive -LiteralPath $zipPath -DestinationPath $extracted -Force
    $root = Find-BundleRoot $extracted
    Copy-Bundle $root $InstallDir

    Write-Host "[INFO] Configurando producao em $InstallDir..."
    $bash = Find-GitBash
    $previousEnv = $env:PDL_ENV_FILE
    $env:PDL_ENV_FILE = Join-Path $InstallDir '.env'
    $env:PDL_IMAGE_REGISTRY = $DefaultRegistry
    try {
        if ($bash) {
            $dirUnix = ($InstallDir -replace '\\', '/')
            if ($dirUnix -match '^([A-Za-z]):/(.*)$') {
                $dirUnix = '/' + $Matches[1].ToLowerInvariant() + '/' + $Matches[2]
            }
            & $bash -lc "cd '$dirUnix' && ./setup.sh configure-production --yes --domain '$Domain' --bind-address '$BindAddress' --port '$Port'"
            if ($LASTEXITCODE -ne 0) { throw 'configure-production falhou' }
        }
        else {
            $configure = Join-Path $InstallDir 'scripts\configure-production.ps1'
            & $configure -Domain $Domain -BindAddress $BindAddress -Port "$Port" -Yes
        }
        Set-PublishedImages $InstallDir $resolved
    }
    finally {
        if ($null -eq $previousEnv) { Remove-Item Env:PDL_ENV_FILE -ErrorAction SilentlyContinue }
        else { $env:PDL_ENV_FILE = $previousEnv }
    }

    Write-Host "[OK] Arquivos em $InstallDir"
    if ($NoStart) {
        Write-Host '[INFO] Instalacao preparada sem iniciar os containers (-NoStart).'
        exit 0
    }
    if ($env:PDL_SKIP_DOCKER -eq '1') {
        Write-Host '[INFO] PDL_SKIP_DOCKER=1: servicos nao foram iniciados.'
        exit 0
    }

    if ($bash) {
        $dirUnix = ($InstallDir -replace '\\', '/')
        if ($dirUnix -match '^([A-Za-z]):/(.*)$') {
            $dirUnix = '/' + $Matches[1].ToLowerInvariant() + '/' + $Matches[2]
        }
        & $bash -lc "cd '$dirUnix' && ./setup.sh install --production"
        if ($LASTEXITCODE -ne 0) { throw 'setup.sh install --production falhou' }
    }
    else {
        Push-Location $InstallDir
        try {
            docker compose --project-directory $InstallDir --env-file (Join-Path $InstallDir '.env') -f (Join-Path $InstallDir 'docker-compose.prod.yml') pull
            if ($LASTEXITCODE -ne 0) { throw 'docker compose pull falhou' }
            docker compose --project-directory $InstallDir --env-file (Join-Path $InstallDir '.env') -f (Join-Path $InstallDir 'docker-compose.prod.yml') up -d --remove-orphans
            if ($LASTEXITCODE -ne 0) { throw 'docker compose up falhou' }
        }
        finally {
            Pop-Location
        }
    }
    Write-Host "[OK] PDL PRO $resolved em execucao. Proximo passo: proxy HTTPS -> http://${BindAddress}:${Port}"
}
finally {
    Remove-Item -Recurse -Force $work -ErrorAction SilentlyContinue
}
