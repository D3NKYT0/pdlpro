@echo off
setlocal
cd /d "%~dp0"

if not exist "backend\.venv\Scripts\python.exe" (
  echo Falta o venv em backend\.venv
  echo Crie com: py -3.14 -m venv backend\.venv
  pause
  exit /b 1
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

echo Subindo PDL PRO com SQLite local. O banco em 192.168.15.4 nao e usado.
echo API:  http://127.0.0.1:8000
echo Site: http://localhost:3000
echo.

start "PDL PRO API" /D "%~dp0backend" cmd /k ^
  "call .venv\Scripts\activate.bat && set "DJANGO_SETTINGS_MODULE=core.settings.development" && set "DATABASE_URL=sqlite:///db.sqlite3" && set "LINEAGE_DB_ENABLED=false" && python manage.py migrate && python manage.py runserver 127.0.0.1:8000"

start "PDL PRO Front" /D "%~dp0frontend" cmd /k "npm run dev"

timeout /t 5 /nobreak >nul
start "" "http://localhost:3000"
