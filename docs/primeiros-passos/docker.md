# Início rápido com Docker

[← Índice da documentação](../README.md)

Este roteiro prepara um ambiente local. Para produção, siga [Implantação](../operacao/implantacao.md).

### Pré-requisitos

- Git.
- Docker Engine ou Docker Desktop com Compose v2.
- Portas `80` e `3000` disponíveis para o ambiente de desenvolvimento.

### Windows PowerShell

```powershell
git clone https://github.com/D3NKYT0/pdlpro.git
Set-Location pdlpro
Copy-Item .env.example .env
docker compose --profile dev up --build
```

### Linux, macOS ou WSL

```bash
git clone https://github.com/D3NKYT0/pdlpro.git
cd pdlpro
cp .env.example .env
docker compose --profile dev up --build
```

As migrações são executadas pelo entrypoint do backend. Depois que os containers
estiverem saudáveis, crie o primeiro administrador:

```bash
docker compose exec backend python manage.py createsuperuser
```

### Endereços locais

| Serviço | URL |
|---|---|
| Aplicação via Nginx | <http://localhost> |
| Frontend Vite | <http://localhost:3000> |
| Django Admin | <http://localhost/admin/> |
| Swagger UI | <http://localhost/api/docs/swagger-ui/> |
| ReDoc | <http://localhost/api/docs/redoc/> |
| Health check | <http://localhost/api/v1/system/health/> |

Para encerrar o ambiente sem apagar os volumes:

```bash
docker compose down
```

> [!CAUTION]
> Não use `docker compose down -v` sem intenção explícita de apagar bancos, Redis,
> mídia e outros volumes locais.

## Próximos passos

- [Ambiente nativo e rotina de desenvolvimento](../desenvolvimento/ambiente-local.md).
- [Variáveis de ambiente](../configuracao/ambiente.md).
- [Testes e qualidade](../desenvolvimento/testes.md).
