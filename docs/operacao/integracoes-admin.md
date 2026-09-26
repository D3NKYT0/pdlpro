# Configurador admin de integrações

[← Índice](../README.md) · [Variáveis de ambiente](../configuracao/ambiente.md) ·
[Instalar (Release)](distribuicao.md) · [Tutoriais](../tutoriais/README.md) ·
[Pagamentos](../integracoes/pagamentos.md) · [Lineage](../integracoes/lineage.md)

## Objetivo

Substituir a edição manual do `.env` + restart do Docker para **Stripe, Mercado Pago,
política de pagamentos, MySQL L2, hosts do game/login, fake players, SMTP, VAPID,
OAuth Google/Discord, hCaptcha, WebAuthn, Denkynho LLM, Cloudflare R2 / Amazon S3 e
Sentry**, com UI em `/panel/admin/integrations` (abas), valores sensíveis cifrados no
banco (Fernet) e efeito imediato nos workers.

## Bootstrap que permanece no `.env`

Estas chaves precisam existir **antes** do Django subir e **não** entram no
configurador:

- `SECRET_KEY`
- `DATABASE_URL`
- `REDIS_*`
- `PDL_DATA_ENCRYPTION_KEY` (mesma chave usada em TOTP/LGPD)

## Precedência

1. Overlay do banco (se a chave existir no documento cifrado da seção)
2. Valor do `.env` / settings de boot

Omitir o campo ou enviar `""` em segredo **mantém** o valor atual. A string
especial `__CLEAR__` remove a chave do overlay e restaura o default de boot.

## Hot-apply

No save: grava o blob Fernet, aplica em `django.conf.settings` do processo e
incrementa `pdl:integrations:rev` no cache (Redis). O middleware
`IntegrationOverlayMiddleware` compara a revisão local com o cache; se mudou,
reaplica o overlay.

Efeitos colaterais por seção:

- **Lineage** — `reset_engine` no gateway SQLAlchemy
- **OAuth** — recalcula `HCAPTCHA_ENABLED`
- **Storage** — remonta `STORAGES` / `MEDIA_URL` (S3Boto3 ou filesystem) e limpa o
  cache do storage handler
- **Observability** — reinicializa o SDK do Sentry no processo

Arquivos privados LGPD (`PRIVATE_MEDIA_ROOT`) **continuam no filesystem** mesmo com
`USE_S3=true`.

## API (somente superadmin)

| Método | Rota | Função |
| --- | --- | --- |
| `GET` | `/api/v1/staff/integrations/` | Status mascarado das seções |
| `PATCH` | `/api/v1/staff/integrations/{section}/` | Mescla e aplica |
| `POST` | `/api/v1/staff/integrations/{section}/test/` | Probe / e-mail de teste |

Seções: `payments` · `lineage` · `smtp` · `oauth` · `denkynho` · `storage` · `observability`.

A API **nunca** devolve segredos em claro: apenas `configured`, `fingerprint`
(12 hex) e campos públicos (host, porta, chaves publicáveis mascaradas).

### Abas

| Aba | Chaves principais |
| --- | --- |
| Pagamentos | Stripe/MP + `PAYMENT_METHODS`, `PAYMENT_WEBHOOK_BASE_URL`, `COINS_PER_USD` |
| Lineage / Game | MySQL L2, SSL, pool, IP/portas, `FAKE_PLAYERS_*` |
| SMTP / Push | SMTP + `VAPID_*` |
| OAuth / Auth | Google, Discord, hCaptcha, `WEBAUTHN_*` |
| Denkynho | `DENKYNHO_LLM_*` / embeddings |
| S3 / R2 | `USE_S3`, `AWS_*` (endpoint R2 ou AWS) |
| Sentry | `SENTRY_DSN`, ambiente, release, traces |

### S3 / Cloudflare R2

Mesmo contrato do CARDGAME: `USE_S3`, access/secret, bucket, `AWS_S3_ENDPOINT_URL`
(ex.: `https://<accountid>.r2.cloudflarestorage.com`), região `auto`, domínio CDN
opcional e checksums boto3 em modo `when_required` (compatível com R2).

## Operação

1. Entre como superadmin em `/panel/admin/integrations`.
2. Preencha a aba desejada e salve — não é necessário reiniciar containers.
3. Use **Testar** para validar credenciais, TCP/MySQL, SMTP, OAuth, Ollama/API,
   `head_bucket` S3/R2 ou formato do DSN Sentry.
4. Para voltar ao valor do `.env`, use **Apagar valor** no campo secreto e salve.

Passo a passo por provedor (DNS, OAuth, hCaptcha, pagamentos, LLM, …):
[Tutoriais de integração](../tutoriais/README.md).

Consulte também [Variáveis de ambiente](../configuracao/ambiente.md) para o mapa
completo das chaves cobertas por cada aba.
