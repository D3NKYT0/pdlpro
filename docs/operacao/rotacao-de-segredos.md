# Rotação de segredos

[← Índice](../README.md) · [Fonte única](../projeto/fonte-unica.md) · [Instalar (Release)](distribuicao.md) · [Integrações admin](integracoes-admin.md)

> **Atualizado:** 25 de setembro de 2026

O PDL PRO combina soft-rotate do Django (`SECRET_KEY_FALLBACKS`), MultiFernet para
dados em repouso, jobs auditáveis no painel e manutenção via Celery Beat.

## Soft-rotate da SECRET_KEY

```bash
./setup.sh configure-production --rotate-secret-key -y
# após REFRESH_TOKEN_DAYS / SECRET_KEY_FALLBACK_TTL_DAYS:
./setup.sh configure-production --prune-secret-fallbacks -y
```

A chave antiga entra em `SECRET_KEY_FALLBACKS` (CSV). Assinaturas antigas
continuam válidas até o prune. Depois do soft-rotate, recrie
`backend` / `asgi` / `celery_worker`.

## Fernet (TOTP, recovery, LGPD)

```bash
./setup.sh configure-production --rotate-data-encryption-key -y
# no painel ou:
python manage.py shell -c "..."  # ou ação reencrypt_sealed_data
./setup.sh configure-production --prune-data-fallbacks -y
```

`PDL_DATA_HMAC_KEY` é estável e **não** acompanha a Fernet. Dumps usam
`BACKUP_ENCRYPTION_KEY` + `BACKUP_ENCRYPTION_KEY_FALLBACKS` (restore tenta todas).

## Painel

Rota `/panel/admin/secrets` (somente `is_superuser`):

- status com fingerprints (nunca o valor);
- ações com confirmação do domínio (`ALLOWED_HOSTS`);
- com `PDL_ALLOW_RUNTIME_SECRET_ROTATION=false` (padrão), rotações de env
  ficam **pendentes**.

Aplicar no host:

```bash
./setup.sh configure-production --apply-pending-rotations -y
# ou
python manage.py apply_secret_rotations
```

Ligue `PDL_ALLOW_RUNTIME_SECRET_ROTATION=true` só se o processo enxergar um
`.env` gravável (ex.: bind-mount). DB/Redis continuam exclusivos do configurador.

## Automação (Fase 4)

Celery Beat (`SECRET_MAINTENANCE_ENABLED`, padrão ligado) roda
`apps.staff.tasks.run_secret_maintenance` diariamente:

- prune de fallbacks após `SECRET_KEY_FALLBACK_TTL_DAYS` (padrão 7);
- se `SECRET_KEY_AUTO_ROTATE_DAYS>0`, agenda/aplica soft-rotate periódico.

## Variáveis

| Variável | Função |
|---|---|
| `SECRET_KEY_FALLBACKS` | CSV de chaves Django antigas |
| `SECRET_KEY_ROTATED_AT` | ISO da última soft-rotate |
| `SECRET_KEY_AUTO_ROTATE_DAYS` | 0 = off |
| `PDL_DATA_ENCRYPTION_KEY_FALLBACKS` | MultiFernet |
| `PDL_DATA_HMAC_KEY` | HMAC estável dos recovery codes |
| `BACKUP_ENCRYPTION_KEY_FALLBACKS` | decrypt de dumps antigos |
| `PDL_ALLOW_RUNTIME_SECRET_ROTATION` | painel/Beat gravam `.env` |
