@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

set "VENV_PY=%~dp0backend\.venv\Scripts\python.exe"
set "TCP=%~dp0scripts\dev_tcp.py"
set "STAMP_PY=%~dp0scripts\file_stamp.py"
set "START_API=1"
set "START_FRONT=1"

call "%~dp0scripts\setup-python.bat"
if errorlevel 1 (
  pause
  exit /b 1
)

"%VENV_PY%" "%TCP%" 127.0.0.1 8000
if not errorlevel 1 (
  echo Backend ja responde em http://127.0.0.1:8000 - nao vou abrir outra janela.
  set "START_API=0"
)

"%VENV_PY%" "%TCP%" 127.0.0.1 3000
if not errorlevel 1 (
  echo Frontend ja responde em http://localhost:3000 - nao vou abrir outra janela.
  set "START_FRONT=0"
)

if "!START_API!"=="1" (
  pushd backend
  .venv\Scripts\python.exe manage.py start_denkynho --settings=core.settings.development
  if errorlevel 1 echo Denkynho iniciara no modo de ajuda basica. Confira o aviso acima.
  popd
)

call :ensure_frontend_deps
if errorlevel 1 (
  pause
  exit /b 1
)

echo Subindo PDL PRO com SQLite local e integracao Lineage definida no .env.
echo API:  http://127.0.0.1:8000
echo Site: http://localhost:3000
echo.

if "!START_API!"=="1" (
  start "PDL PRO API" /D "%~dp0backend" cmd /k run-dev.bat
) else (
  echo Pulando a janela da API.
)

if "!START_FRONT!"=="1" (
  start "PDL PRO Front" /D "%~dp0frontend" cmd /k npm run dev
) else (
  echo Pulando a janela do Vite.
)

if "!START_API!"=="1" goto :wait_then_open
if "!START_FRONT!"=="1" goto :wait_then_open
echo Os dois servicos ja estavam no ar.
start "" "http://localhost:3000"
exit /b 0

:wait_then_open
timeout /t 5 /nobreak >nul
start "" "http://localhost:3000"
exit /b 0

:ensure_frontend_deps
if not exist "frontend\package.json" exit /b 0
if not exist "frontend\node_modules\" goto :npm_install
if not exist "frontend\package-lock.json" exit /b 0
if not exist "frontend\node_modules\.pdl-lock.sha256" (
  echo node_modules ja presente. Pulando npm install.
  "%VENV_PY%" "%STAMP_PY%" write "frontend\package-lock.json" "frontend\node_modules\.pdl-lock.sha256"
  exit /b 0
)
"%VENV_PY%" "%STAMP_PY%" check "frontend\package-lock.json" "frontend\node_modules\.pdl-lock.sha256"
if not errorlevel 1 (
  echo Dependencias do frontend em dia. Pulando npm install.
  exit /b 0
)

:npm_install
echo Instalando dependencias do frontend...
pushd frontend
call npm install
if errorlevel 1 (
  echo npm install falhou.
  popd
  exit /b 1
)
popd
if exist "frontend\package-lock.json" (
  "%VENV_PY%" "%STAMP_PY%" write "frontend\package-lock.json" "frontend\node_modules\.pdl-lock.sha256"
)
exit /b 0
