# Ambiente de demonstração isolado

[← Índice da documentação](../README.md)

`core.settings.preview` usa `backend/preview.sqlite3`, sem acesso ao banco do jogo ou pagamentos reais. Nunca use essas configurações em produção.

```powershell
# Backend, em backend/
.venv/Scripts/python.exe manage.py migrate --settings=core.settings.preview
.venv/Scripts/python.exe manage.py seed_program_preview --settings=core.settings.preview --password "SENHA-LOCAL-DE-TESTE"
.venv/Scripts/python.exe manage.py runserver 127.0.0.1:8001 --settings=core.settings.preview

# Frontend, em frontend/, em outro terminal
$env:PDL_API_TARGET = 'http://127.0.0.1:8001'
npm run dev -- --host 127.0.0.1 --port 3001 --strictPort
```

O comando de dados fictícios é protegido contra uso nas configurações normais. Reexecutá-lo redefine os valores demonstrativos do usuário `preview`.

Verificações automatizadas: `pytest`, `npm run test:run`, `npm run build`, `manage.py check` e `makemigrations --check --dry-run`. A inspeção visual usa o tema existente em desktop e celular, incluindo formulários, histórico, estados vazios, ações desabilitadas e bloqueio de recursos.

Para a suíte automatizada, consulte [Testes e qualidade](testes.md).
