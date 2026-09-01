@echo off
setlocal
cd /d "%~dp0"

if not exist "backend\.venv\Scripts\python.exe" (
  echo Criando venv em backend\.venv...
  py -3.14 -m venv backend\.venv 2>nul
  if not exist "backend\.venv\Scripts\python.exe" (
    python -m venv backend\.venv
  )
  if not exist "backend\.venv\Scripts\python.exe" (
    echo Nao foi possivel criar o venv. Instale Python 3.14.
    pause
    exit /b 1
  )
)

fc /b "backend\requirements.txt" "backend\.venv\.requirements-installed" >nul 2>&1
if errorlevel 1 (
  echo Instalando dependencias do Python...
  "backend\.venv\Scripts\python.exe" -m pip install --upgrade pip
  if errorlevel 1 (
    echo pip upgrade falhou.
    pause
    exit /b 1
  )
  "backend\.venv\Scripts\python.exe" -m pip install -r backend\requirements.txt
  if errorlevel 1 (
    echo pip install falhou.
    pause
    exit /b 1
  )
  copy /Y "backend\requirements.txt" "backend\.venv\.requirements-installed" >nul
)

if not exist "frontend\node_modules\" (
  echo Instalando dependencias do frontend...
  pushd frontend
  call npm install
  if errorlevel 1 (
    echo npm install falhou.
    pause
    exit /b 1
  )
  popd
)

echo Subindo PDL PRO com SQLite local e integracao Lineage definida no .env.
echo API:  http://127.0.0.1:8000
echo Site: http://localhost:3000
echo.

start "PDL PRO API" /D "%~dp0backend" cmd /k run-dev.bat
start "PDL PRO Front" /D "%~dp0frontend" cmd /k npm run dev

timeout /t 5 /nobreak >nul
start "" "http://localhost:3000"
