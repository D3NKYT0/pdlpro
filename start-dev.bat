@echo off
setlocal
cd /d "%~dp0"

call "%~dp0scripts\setup-python.bat"
if errorlevel 1 (
  pause
  exit /b 1
)

pushd backend
.venv\Scripts\python.exe manage.py start_denkynho --settings=core.settings.development
if errorlevel 1 echo Denkynho iniciara no modo de ajuda basica. Confira o aviso acima.
popd

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
