# Configurador admin de integrações

[← Índice](../README.md) · [Variáveis de ambiente](../configuracao/ambiente.md) · [Pagamentos](../integracoes/pagamentos.md) · [Lineage](../integracoes/lineage.md)

## Objetivo

Substituir a edição manual do `.env` + restart do Docker para **Stripe, Mercado Pago,
MySQL L2, hosts do game/login server e SMTP**, com UI em `/panel/admin/integrations`
(abas), valores sensíveis cifrados no banco (Fernet) e efeito imediato nos workers.

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
reaplica o overlay. Em mudanças Lineage, o gateway SQLAlchemy dá `dispose` no pool
(`reset_engine`) e recria o engine na próxima consulta.

## API (somente superadmin)

| Método | Rota | Função |
| --- | --- | --- |
| `GET` | `/api/v1/staff/integrations/` | Status mascarado das três seções |
| `PATCH` | `/api/v1/staff/integrations/{payments\|lineage\|smtp}/` | Mescla e aplica |
| `POST` | `/api/v1/staff/integrations/{payments\|lineage\|smtp}/test/` | Probe / e-mail de teste |

A API **nunca** devolve segredos em claro: apenas `configured`, `fingerprint`
(12 hex) e campos públicos (host, porta, chaves publicáveis mascaradas).

## Operação

1. Entre como superadmin em `/panel/admin/integrations`.
2. Preencha a aba desejada e salve — não é necessário reiniciar containers.
3. Use **Testar** para validar credenciais de pagamento, TCP/MySQL do jogo ou
   envio SMTP (destino = e-mail do superadmin).
4. Para voltar ao valor do `.env`, use **Apagar valor** no campo secreto e salve.

Consulte também [Variáveis de ambiente](../configuracao/ambiente.md) para o mapa
completo das chaves cobertas por cada aba.
