# Auditoria de dependências Python — 2026-09-03

Ambiente: backend/.venv, Python 3.14. Nenhuma dependência de aplicação foi atualizada.

## Segurança

pip-audit: 2 vulnerabilidades conhecidas em djangorestframework 3.17.1: CVE-2026-73228 e CVE-2026-73229. Ambas indicam correção em 3.17.2. Versão mais recente consultada: 3.18.0.

pip check: nenhum requisito incompatível encontrado.

## Versões disponíveis

| Pacote | Instalada | Mais recente |
| --- | --- | --- |
| asgiref | 3.11.1 | 3.12.1 |
| cbor2 | 5.9.0 | 6.1.4 |
| cron-descriptor | 1.4.5 | 2.1.0 |
| cryptography | 50.0.0 | 50.0.1 |
| daphne | 4.2.2 | 4.2.3 |
| Django | 6.0.8 | 6.1.1 |
| django-allauth | 65.16.1 | 65.19.2 |
| django-environ | 0.13.0 | 0.14.0 |
| django-filter | 25.2 | 26.1 |
| django-jazzmin | 3.0.4 | 3.0.5 |
| django-redis | 6.0.0 | 7.0.0 |
| djangorestframework | 3.17.1 | 3.18.0 |
| drf-spectacular | 0.29.0 | 0.30.0 |
| Faker | 40.15.0 | 40.38.0 |
| flower | 2.0.1 | 2.1.0 |
| gunicorn | 26.0.0 | 26.2.0 |
| mercadopago | 2.4.0 | 3.5.0 |
| mpmath | 1.3.0 | 1.4.1 |
| PyMySQL | 1.1.2 | 1.2.0 |
| pyotp | 2.9.0 | 2.10.0 |
| pytest | 9.0.3 | 9.1.1 |
| pytest-django | 4.12.0 | 4.14.0 |
| python-dotenv | 1.2.2 | 1.2.3 |
| pywebpush | 2.0.3 | 2.5.0 |
| redis | 7.4.0 | 8.1.0 |
| ruff | 0.15.12 | 0.16.6 |
| SQLAlchemy | 2.0.46 | 2.0.52 |
| stripe | 15.1.0 | 15.6.1 |
| webauthn | 2.8.0 | 3.0.0 |
| whitenoise | 6.11.0 | 6.12.0 |

## Atualização aplicada em 2026-09-04

As dependências diretas foram atualizadas no `backend/requirements.txt` e instaladas
no `backend/.venv`, com resolução das dependências transitivas. O DRF passou para
3.18.0. Após a atualização, `pip-audit` não encontrou vulnerabilidades conhecidas
e `pip check` não encontrou conflitos.

Permanecem por compatibilidade:

- Django 6.0.8: django-celery-beat 2.9.0 exige Django <6.1.
- cron-descriptor 1.4.5: django-celery-beat exige versão <2.0.
- mpmath 1.3.0: SymPy exige versão <1.4.

Validação: 94 testes focados de autenticação, pagamentos e notificações passaram;
a suíte completa do backend passou com 775 testes e 85,29% de cobertura.
Django check e verificação de migrações passaram. Nenhuma operação real de
pagamento, e-mail ou servidor de jogo foi executada na suíte.

Pendência: Ruff 0.16.6 reporta 579 ocorrências no código existente, principalmente
RUF012 (353) e I001 (163). Não foram reduzidas regras nem aplicadas correções
em massa para ocultar esses resultados.

A validação final do frontend passou com 695 testes, cobertura aprovada,
TypeScript e build concluídos. A API local foi reiniciada e o FAQ respondeu HTTP 200.
Foram atualizadas 26 dependências diretas e o cbor2 transitivo. A limpeza do cache
local de auditoria foi bloqueada pela revisão automática; a pasta ficou intacta.
