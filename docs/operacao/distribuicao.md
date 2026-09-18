# Distribuição das versões publicadas

[← Índice da documentação](../README.md) · [Implantação](implantacao.md)

O operador instala uma **tag publicada** (imagens Docker no GHCR + ZIP com
Compose e `setup.sh`). O jogador só acessa o domínio do painel; ele não
instala o PDL.

A primeira release com este fluxo é a próxima tag `v*` após o workflow
existir. Enquanto a Release não estiver no GitHub, use o [clone + Compose](implantacao.md).

## O que cada tag publica

| Artefato | Função |
| --- | --- |
| `ghcr.io/<repo>/backend:X.Y.Z` | API, ASGI e Celery |
| `ghcr.io/<repo>/web:X.Y.Z` | SPA compilada + Nginx |
| `pdl-pro-X.Y.Z.zip` | Compose sem build, `setup.sh`, scripts e `.env.example` |
| `pdl-pro-X.Y.Z.zip.sha256` | Checksum do ZIP |
| `install.sh` / `install.ps1` | Bootstrap Linux e Windows |

O ZIP **não** inclui o código-fonte da aplicação. Quem precisa buildar a
partir do Git continua usando `docker-compose.prod.yml` no clone, com
`pdl_backend:local` / `pdl_web:local`.

## Linux

Pré-requisitos: Docker Engine com Compose v2, `curl` e permissão de escrita
no diretório de instalação (`/opt/pdlpro` ou `~/pdlpro`).

```bash
curl -fsSL https://github.com/D3NKYT0/pdlpro/releases/latest/download/install.sh -o install.sh
bash install.sh --domain painel.exemplo.com --yes
```

Opções úteis: `--version 2.5.2`, `--dir /opt/pdlpro`, `--port 8080`,
`--no-start`. Sem `--yes` o script pede o domínio e confirma.

O instalador configura o `.env` (equivalente a
`./setup.sh configure-production`), grava as imagens publicadas e executa
`./setup.sh install --production`, que **puxa** as imagens em vez de
construí-las. A senha do Redis entra no `.env` antes do primeiro Compose: o
arquivo de produção interpola `REDIS_PASSWORD` mesmo só para subir o Postgres.

Se um ZIP antigo da 2.5.2 abortar com `REDIS_PASSWORD is required`, veja
[Solução de problemas](solucao-de-problemas.md#installsh-aborta-com-redis_password-is-required).

## Windows

Pré-requisitos: Docker Desktop em execução. Git Bash é opcional: quando
existe, o instalador reutiliza o `setup.sh`; senão, usa
`scripts/configure-production.ps1` e o `docker compose` nativo.

```powershell
Invoke-WebRequest -UseBasicParsing `
  -Uri https://github.com/D3NKYT0/pdlpro/releases/latest/download/install.ps1 `
  -OutFile install.ps1
powershell -File .\install.ps1 -Domain painel.exemplo.com -Yes
```

O destino padrão é `%LOCALAPPDATA%\PDL\PRO`. Passe `-InstallDir`,
`-Version`, `-Port` ou `-NoStart` quando precisar.

## Depois da instalação

1. No Ubuntu da mesma máquina, suba o Nginx do sistema e o certificado:

```bash
cd /opt/pdlpro
./setup.sh nginx --yes --ssl --email voce@painel.exemplo.com
```

O proxy aponta para `http://127.0.0.1:8080` (ou a porta do `.env`). Detalhe em
[Implantação](implantacao.md).
2. Crie o administrador:

```bash
docker compose --env-file .env -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

No Windows, o mesmo comando vale no PowerShell a partir da pasta de instalação.

3. Confira `/api/v1/system/health/` e `/api/v1/system/version/`.

## Atualizar

Faça backup, baixe a tag nova no mesmo diretório e suba de novo. O `.env`
existente é preservado; as chaves `PDL_*_IMAGE` passam a apontar para a
versão pedida.

```bash
cd /opt/pdlpro
./setup.sh backup
bash install.sh --dir /opt/pdlpro --domain painel.exemplo.com --version 2.5.2 --yes
```

Não misture um clone Git que constrói imagens locais com um diretório
instalado por release sem revisar `PDL_BACKEND_IMAGE` e
`PDL_IMAGE_PULL_POLICY`. Para voltar ao build a partir do código, esvazie
essas variáveis e use `./setup.sh deploy --production --build`.

## Publicar uma versão (mantenedor)

1. Atualize `version.json` e o [changelog](../historico/changelog.md).
2. Crie a tag anotada `vX.Y.Z` com o mesmo número, ou dispare o workflow
   **Release publicada**.
3. O CI roda a suíte, publica as imagens no GHCR e anexa o ZIP e os
   instaladores à GitHub Release.
4. Deixe os pacotes `backend` e `web` do GHCR **públicos** na primeira
   publicação; sem isso o `docker pull` do operador falha.

Gere só o ZIP localmente, sem publicar imagens:

```bash
./setup.sh pack-release
```

O arquivo vai para `dist/`. Variáveis: `PDL_GITHUB_REPO` (padrão
`D3NKYT0/pdlpro`) e `PDL_IMAGE_REGISTRY` (padrão
`ghcr.io/d3nkyt0/pdlpro`).

## Limites

- As imagens publicadas são `linux/amd64`. No Windows isso é o Docker
  Desktop (WSL2), não um executável nativo.
- O frontend publicado sai sem DSN de Sentry. Quem precisa de source maps
  próprios reconstrói a imagem `web` a partir do repositório.
- `PDL_SKIP_DOCKER` e `PDL_INSTALL_DRY_RUN` existem para a suíte; não use
  na instalação real.
- A [licença](../projeto/licenca.md) permite redistribuir o instalador de
  graça e proíbe vender o painel ou oferecê-lo como serviço pago sem
  autorização.
