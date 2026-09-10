# Auditoria de dependências Python — 2026-09-10

Ambiente: `backend/.venv`, Python 3.14.

## Segurança

`pip-audit -r requirements.txt` antes da atualização: 3 vulnerabilidades em
`bleach` 6.3.0 (`GHSA-gj48-438w-jh9v`, `GHSA-8rfp-98v4-mmr6`, `GHSA-g75f-g53v-794x`).
As duas primeiras têm correção em 6.4.0; a terceira (`linkify(..., parse_email=True)`)
não tem patch e o projeto só usa `bleach.clean` em `common/richtext.py`.

`torch` 2.14.0+cpu continua fora do índice PyPI e é ignorado na auditoria.

Após a atualização: `pip-audit` sem vulnerabilidades conhecidas; `pip check` ok.

## Atualizações aplicadas

| Pacote | De | Para |
| --- | --- | --- |
| bleach | 6.3.0 | 6.4.0 |
| djangorestframework | 3.18.0 | 3.18.1 |
| mercadopago | 3.5.0 | 3.6.0 |
| psycopg2-binary | 2.9.12 | 2.9.13 |
| sentry-sdk | 2.68.1 | 2.69.1 |

## Mantidos por compatibilidade

- Django 6.0.8 (mais recente 6.1.1): `django-celery-beat` 2.9.0 exige Django <6.1.
- cron-descriptor 1.4.x / mpmath 1.3.x: restrições transitivas inalteradas.
