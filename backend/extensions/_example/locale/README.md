# gettext da extensão

Coloque os catálogos aqui:

```text
locale/en/LC_MESSAGES/django.po
locale/es/LC_MESSAGES/django.po
locale/pt_BR/LC_MESSAGES/django.po
```

O core inclui automaticamente cada `extensions/*/locale` em `LOCALE_PATHS`.

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py makemessages -l en -l es -l pt_BR --ignore=.venv
.\.venv\Scripts\python.exe manage.py compilemessages -l en -l es -l pt_BR --ignore=.venv
```
