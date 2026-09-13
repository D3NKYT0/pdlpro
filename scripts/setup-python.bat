@echo off
setlocal EnableDelayedExpansion
set "STAMP_PY=%~dp0file_stamp.py"
pushd "%~dp0.." || exit /b 1

set "VENV_PY=backend\.venv\Scripts\python.exe"
set "REQ=backend\requirements.txt"
set "STAMP=backend\.venv\.pdl-req.sha256"
set "CREATED=0"

if not exist "%REQ%" (
  echo Nao encontrei backend\requirements.txt.
  goto :failed
)

if not exist "%VENV_PY%" (
  echo Criando ambiente Python em backend\.venv...
  py -3.14 -m venv backend\.venv
  if errorlevel 1 (
    python -m venv backend\.venv
    if errorlevel 1 goto :failed
  )
  set "CREATED=1"
)

if "%CREATED%"=="1" (
  echo Atualizando pip no ambiente novo...
  "%VENV_PY%" -m pip install --upgrade pip
  if errorlevel 1 goto :failed
)

if /i "%PDL_FORCE_PIP%"=="1" (
  echo PDL_FORCE_PIP=1: sincronizando dependencias.
  goto :sync
)
if "%CREATED%"=="1" goto :sync

"%VENV_PY%" "%STAMP_PY%" check "%REQ%" "%STAMP%"
if errorlevel 2 goto :failed
if not errorlevel 1 (
  echo Dependencias Python em dia. Pulando pip.
  popd
  exit /b 0
)

:sync
echo Instalando dependencias conforme requirements.txt...
"%VENV_PY%" -m pip install -r "%REQ%"
if errorlevel 1 goto :failed

"%VENV_PY%" -m pip check
if errorlevel 1 goto :failed

"%VENV_PY%" "%STAMP_PY%" write "%REQ%" "%STAMP%"
if errorlevel 1 goto :failed

popd
exit /b 0

:failed
echo Falha ao preparar o ambiente Python. A inicializacao foi interrompida.
popd
exit /b 1
