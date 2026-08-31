# Implantação

## Estado do Compose

O `docker-compose.yml` atual é uma base de desenvolvimento e integração. Ele executa backend, ASGI, worker, bancos, Nginx e — com o perfil `dev` — Vite. Não é uma distribuição de produção pronta porque o frontend ainda é servido pelo servidor de desenvolvimento e o Nginx está configurado para `localhost` e HTTP.

## Topologia atual

```text
Internet/local host
       │ :80
     Nginx
       ├── /api, /admin ──> Gunicorn :8000
       ├── /ws ───────────> Daphne :8001
       ├── /static, /media
       └── / ─────────────> Vite :3000 (perfil dev)

Gunicorn/Daphne/Celery ──> PostgreSQL + Redis
                       └─> MySQL Lineage 2 (opcional)
```

## Checklist de produção

### Aplicação

- Defina `DJANGO_SETTINGS_MODULE=core.settings.production`.
- Gere um `SECRET_KEY` longo, aleatório e exclusivo.
- Configure `ALLOWED_HOSTS`, CORS, CSRF e WebSocket com os domínios reais.
- Use `GUNICORN_RELOAD=false`.
- Execute `python manage.py check --deploy`.
- Decida como migrações serão serializadas entre réplicas; evite múltiplos containers migrando simultaneamente.
- Execute e verifique `collectstatic`.

### Frontend e proxy

- Gere o frontend com `npm ci && npm run build`.
- Sirva `frontend/dist` por Nginx, CDN ou storage estático; não use Vite em produção.
- Configure fallback da SPA para `index.html`.
- Ajuste `server_name` e os limites de upload.
- Termine TLS no proxy e preserve corretamente os cabeçalhos `X-Forwarded-*`.
- Garanta upgrade de conexão em `/ws/`.

### Dados e filas

- Use PostgreSQL e Redis gerenciados ou com persistência, autenticação e rede privada.
- Restrinja o MySQL do Lineage aos hosts e permissões necessários.
- Execute worker Celery e Celery Beat separadamente se o fechamento automático de leilões estiver habilitado.
- Defina política de retry, observabilidade e fila de falhas para tarefas críticas.
- Faça backups automáticos de banco e mídia e teste a restauração.

### Integrações

- Remova `mock` de `PAYMENT_METHODS` em produção.
- Valide assinaturas de webhooks e use endpoints HTTPS públicos.
- Ative Mercado Pago/Stripe somente após testes de pagamento, duplicidade, cancelamento e estorno.
- Configure backend SMTP real e monitore rejeições.
- Proteja a chave VAPID privada como segredo.

### Segurança e observabilidade

- Armazene segredos em cofre/secret manager, nunca na imagem ou no Git.
- Centralize logs sem tokens, senhas ou dados de pagamento.
- Monitore latência, erros 5xx, fila Celery, conexões e espaço em disco.
- Use `X-Request-ID` para correlação entre proxy e aplicação.
- Restrinja ou proteja admin e documentação OpenAPI conforme o ambiente.
- Aplique atualizações de segurança e siga [SECURITY.md](../SECURITY.md).

## Verificação após implantação

1. Consulte `/api/v1/system/health/` e `/api/v1/system/version/`.
2. Faça cadastro/login e confirme cookies `Secure`, `HttpOnly` e política `SameSite`.
3. Exercite uma requisição mutável para validar CSRF.
4. Teste a renovação e o logout da sessão.
5. Abra um WebSocket autenticado e confirme rejeição de origem indevida.
6. Verifique conectividade do Lineage com uma operação somente leitura.
7. Faça transação de pagamento em sandbox antes de ativar o modo real.
8. Confirme envio de e-mail, push, tarefa Celery e restauração de backup.

## Rollback

Mantenha imagens versionadas e trate migrações destrutivas em etapas compatíveis com a versão anterior. Antes de cada release:

- registre a versão implantada de `version.json`;
- crie backup verificável;
- documente se a migração permite downgrade;
- defina como reverter frontend, backend e workers juntos;
- não reverta código que dependa de uma migração irreversível sem um plano de dados.
