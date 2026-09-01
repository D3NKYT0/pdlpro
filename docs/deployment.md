# Implantação

## Modos do Compose

- `docker-compose.yml`: desenvolvimento e integração, com Vite no perfil `dev`.
- `docker-compose.prod.yml`: produção, com frontend compilado, Django em settings
  de produção e Caddy fornecendo HTTPS automático.

O domínio padrão da produção é `pdl.denky.dev.br`, mas pode ser alterado pela
variável `DOMAIN`.

## Topologia atual

```text
Internet/local host
       │ :80
  Caddy (:80/:443)
       ├── /api, /admin ──> Gunicorn :8000
       ├── /ws ───────────> Daphne :8001
       ├── /static, /media
       └── / ─────────────> React estático

Gunicorn/Daphne/Celery ──> PostgreSQL + Redis
                       └─> MySQL Lineage 2 (opcional)
```

## Primeira implantação

Antes do deploy:

1. Crie um registro DNS `A` para `pdl.denky.dev.br` apontando para o IPv4 do
   servidor (e `AAAA` somente se o IPv6 funcionar no servidor).
2. Libere TCP `80` e `443` e UDP `443` no firewall. A porta `22` deve permanecer
   disponível para SSH.
3. Instale Docker Engine com o plugin Docker Compose v2.

O DNS de `pdl.denky.dev.br` usa proxy da Cloudflare. Configure SSL/TLS como
`Full (strict)`, nunca `Flexible`. Se a primeira emissão do certificado falhar,
altere o registro temporariamente para `DNS only`, aguarde a emissão pelo Caddy
e reative o proxy.

No servidor:

```bash
sudo mkdir -p /opt/pdlpro
sudo chown "$USER":"$USER" /opt/pdlpro
git clone https://github.com/D3NKYT0/pdlpro.git /opt/pdlpro
cd /opt/pdlpro
cp .env.example .env
nano .env
```

Configure ao menos os valores abaixo. Gere `SECRET_KEY` com
`openssl rand -hex 64` e `DB_PASSWORD` com `openssl rand -hex 32`.

```dotenv
DOMAIN=pdl.denky.dev.br
ACME_EMAIL=admin@pdl.denky.dev.br
SECRET_KEY=valor-aleatorio-com-no-minimo-50-caracteres
DB_NAME=pdl
DB_USER=pdl
DB_PASSWORD=valor-aleatorio-com-no-minimo-16-caracteres
ALLOWED_HOSTS=pdl.denky.dev.br
CORS_ALLOWED_ORIGINS=https://pdl.denky.dev.br
CSRF_TRUSTED_ORIGINS=https://pdl.denky.dev.br
PROJECT_URL=https://pdl.denky.dev.br
FRONTEND_URL=https://pdl.denky.dev.br
WEBAUTHN_RP_ID=pdl.denky.dev.br
WEBAUTHN_ORIGINS=https://pdl.denky.dev.br
GUNICORN_RELOAD=false
RUN_COLLECTSTATIC=true
OPENAPI_DOCS_PUBLIC=false
```

Inicie a aplicação:

```bash
./setup.sh install --production
docker compose --env-file .env -f docker-compose.prod.yml ps
docker compose --env-file .env -f docker-compose.prod.yml logs --tail=100 web backend
```

Quando DNS e portas estiverem corretos, o Caddy solicitará e renovará o
certificado automaticamente. Acesse `https://pdl.denky.dev.br` e crie o admin:

```bash
docker compose --env-file .env -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

## Atualizações

Faça backup antes de aplicar uma nova versão:

```bash
cd /opt/pdlpro
./setup.sh backup
git pull --ff-only
./setup.sh deploy --production
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
