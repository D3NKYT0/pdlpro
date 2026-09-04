@echo off
setlocal
pushd "%~dp0.." || exit /b 1

if not exist "backend\.venv\Scripts\python.exe" (
  echo Criando ambiente Python em backend\.venv...
  py -3.14 -m venv backend\.venv
  if errorlevel 1 (
    python -m venv backend\.venv
    if errorlevel 1 goto :failed
  )
)

"backend\.venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 goto :failed

echo Instalando e atualizando dependencias conforme requirements.txt...
"backend\.venv\Scripts\python.exe" -m pip install --upgrade -r "backend\requirements.txt"
if errorlevel 1 goto :failed

"backend\.venv\Scripts\python.exe" -m pip check
if errorlevel 1 goto :failed

popd
exit /b 0

:failed
echo Falha ao preparar o ambiente Python. A inicializacao foi interrompida.
popd
exit /b 1
