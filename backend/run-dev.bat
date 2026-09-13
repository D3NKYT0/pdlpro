@echo off
cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" (
  ".venv\Scripts\python.exe" "%~dp0..\scripts\dev_tcp.py" 127.0.0.1 8000
  if not errorlevel 1 (
    echo Ja existe um processo em http://127.0.0.1:8000. Nao vou iniciar outro runserver.
    exit /b 0
  )
)
call .venv\Scripts\activate.bat
set "DJANGO_SETTINGS_MODULE=core.settings.development"
set "DATABASE_URL=sqlite:///db.sqlite3"
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
