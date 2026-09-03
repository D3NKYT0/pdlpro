# Observabilidade e auditoria

[Índice](../README.md) · [Implantação](implantacao.md) · [Solução de problemas](solucao-de-problemas.md)

O PDL PRO registra eventos operacionais em `stdout`/`stderr`, adequados para coleta pelo Docker,
Loki, Elastic, CloudWatch ou pelo agente da plataforma. Em produção cada linha da aplicação e do
Nginx é JSON; no desenvolvimento o padrão da aplicação é legível para humanos.

## Correlação e esquema

Toda resposta recebe `X-Request-ID`. Um valor recebido é reutilizado somente quando contém de 1 a
128 caracteres alfanuméricos ou `._:-`; valores ausentes ou inválidos são substituídos por UUID.
O identificador é acrescentado automaticamente aos logs produzidos durante a requisição e fica
exposto pelo CORS para que o frontend possa mostrá-lo em mensagens de suporte.

Eventos HTTP da aplicação usam os campos `timestamp`, `level`, `service`, `environment`, `logger`, `message`, `request_id`,
`event`, `http_method`, `http_path`, `http_status`, `duration_ms` e `user_id`. A rota normalizada é
preferida ao URL concreto para reduzir cardinalidade e evitar registrar identificadores presentes
no caminho. Nunca registre corpos HTTP, cookies, cabeçalhos de autorização, tokens ou senhas.
Metadados estruturados com nomes sensíveis são mascarados pelo formatador JSON.

Use campos estruturados ao acrescentar um evento:

```python
logger.info(
    "Pagamento confirmado",
    extra={"event": "payment.confirmed", "payment_order_id": str(order.id)},
)
```

## Variáveis

| Variável | Padrão | Finalidade |
| --- | --- | --- |
| `LOG_FORMAT` | `json` em produção; `console` fora dela | Formato das linhas da aplicação |
| `LOG_LEVEL` | `INFO` | Nível global, Django, Celery e ASGI |
| `APP_LOG_LEVEL` | `LOG_LEVEL`; `DEBUG` no desenvolvimento | Nível dos módulos `apps.*` |
| `DJANGO_LOG_LEVEL` | `LOG_LEVEL` | Sobrescrita exclusiva do Django |
| `SERVICE_NAME` | `pdl-backend` | Origem do evento; o Compose diferencia API, ASGI e Celery |
| `LOG_ENVIRONMENT` | `development` ou `production` | Ambiente incluído nos eventos estruturados |
| `AUDIT_LOG_RETENTION_DAYS` | `365` | Retenção das ações de staff |
| `WEBHOOK_LOG_RETENTION_DAYS` | `90` | Retenção dos payloads de webhook |
| `SENTRY_DSN` / `VITE_SENTRY_DSN` | vazio | Ativa alertas e tracing no backend/frontend de produção |
| `SENTRY_ENVIRONMENT` | `production` | Ambiente enviado ao monitoramento |
| `SENTRY_RELEASE` | vazio | Versão implantada, idealmente SHA ou tag |
| `SENTRY_TRACES_SAMPLE_RATE` | `0.05` | Fração entre 0 e 1 das transações monitoradas |

O monitoramento externo nunca envia PII por padrão e cada camada fica totalmente desativada sem
seu DSN. O frontend também captura falhas não tratadas e recuperáveis do React. Erros HTTP expõem
o `requestId` no objeto `ApiError`, permitindo mostrar ou registrar o código de suporte sem revelar
detalhes internos. As variáveis `VITE_*` são incorporadas no build do navegador; refaça a imagem
`web` ao alterá-las. O SDK do frontend fica em um chunk carregado sob demanda e não é baixado sem
DSN configurado. Em CI, defina também `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` e `SENTRY_PROJECT`: o build
gera source maps ocultos, envia-os ao release e os remove de `dist`. Mantenha o token apenas no
cofre de segredos do CI, nunca no `.env`, na imagem ou no repositório.

## Auditoria administrativa

`POST`, `PUT`, `PATCH` e `DELETE` autenticados sob `/api/v1/staff/` criam um `AuditLog` contendo
ator, ação, request ID, IP, método, rota, status, alvo e resultado. O corpo da requisição não é
persistido. Falhas de validação e autorização de um membro da equipe também ficam registradas; uma
falha ao gravar auditoria gera log de erro, mas não substitui a resposta da operação principal.

Os registros são somente leitura no Django Admin e o modelo rejeita edição ou remoção direta. O
admin nativo do Django mantém seu próprio histórico para operações feitas diretamente em `/admin/`.

## Retenção e operação

O Compose limita cada arquivo local de log a 10 MB e mantém cinco arquivos por contêiner. Aplique
a retenção do banco diariamente. O comando é seguro por padrão e apenas mostra a quantidade:

```bash
python manage.py prune_observability_logs
python manage.py prune_observability_logs --apply
```

Antes de aplicar em produção, confira o preview, o backup e os valores de retenção. Configure a
plataforma para alertar ao menos sobre erros 5xx, reinícios de contêiner, falhas do Celery, aumento
de latência e ausência de logs/health checks. Durante um incidente, pesquise primeiro pelo
`request_id` recebido pelo cliente e correlacione Nginx, Django, Celery e o provedor externo.
