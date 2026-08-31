@echo off
cd /d "%~dp0"
call .venv\Scripts\activate.bat
set "DJANGO_SETTINGS_MODULE=core.settings.development"
set "DATABASE_URL=sqlite:///db.sqlite3"
set "LINEAGE_DB_ENABLED=false"
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
