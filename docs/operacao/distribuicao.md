# Instalar a partir da Release (recomendado)

[← Índice da documentação](../README.md) · [Backup](backup-e-restauracao.md) ·
[Problemas](solucao-de-problemas.md)

**Este é o caminho recomendado para colocar o PDL PRO no ar.** As
[GitHub Releases](https://github.com/D3NKYT0/pdlpro/releases) publicam
instaladores, ZIP e imagens prontas no GHCR. Você não clona o repositório nem
compila o código.

O jogador só acessa o domínio; ele não instala o PDL.

> Precisa buildar a partir do código-fonte, mudar a topologia ou publicar uma
> versão? Isso é trabalho de manutenção técnica — veja
> [Implantação avançada](implantacao.md). Operadores de VPS devem ficar neste
> guia.

## O que você vai fazer

1. Instalar o Docker e apontar o DNS para o servidor.
2. Rodar o `install.sh` (ou o `install.ps1` no Windows). O painel sobe em
   `http://127.0.0.1:8080`.
3. No Ubuntu da mesma máquina, ligar o HTTPS com `./setup.sh nginx`.
4. Criar o administrador.
5. Conferir health e version.
6. Se o launcher precisar de FTP, rodar `./setup.sh ftp`.

**Não publique a porta 8080 na internet.** O Nginx da máquina (ou outro proxy
na rede privada) é quem recebe 80/443.

## Antes de começar

- Docker Engine com Compose v2 (Linux) ou Docker Desktop (Windows).
  Se ainda não tiver o Docker instalado, passe `--install-docker` ao
  instalador e ele faz isso automaticamente (requer `apt`, `dnf` ou `yum` e
  `root`/`sudo`).
- `curl` no Linux.
- Um domínio com registro `A` (e `AAAA` só se o IPv6 do servidor funcionar),
  por exemplo `seudominio.com`.
- Portas `80` e `443` livres no servidor, para o certificado e o HTTPS.
- O diretório de instalação criado e com permissão de escrita pelo usuário que
  vai rodar o Docker (veja o passo 0 abaixo).

O instalador sem `--version` pega sempre a última release publicada.

## Linux

Os comandos abaixo assumem Ubuntu e `/opt/pdlpro`. Troque o domínio e o e-mail
pelos seus.

### 0. Criar a pasta de instalação

O instalador **não** cria `/opt/pdlpro` por conta própria — ele apenas grava
arquivos lá. Crie a pasta uma única vez antes de rodar qualquer script:

```bash
# Cria o diretório e entrega a propriedade ao seu usuário
sudo mkdir -p /opt/pdlpro
sudo chown "$USER":"$USER" /opt/pdlpro
chmod 750 /opt/pdlpro
```

> **Por que `750`?** O dono lê, escreve e executa; o grupo (usualmente `docker`
> ou o próprio usuário) só lê; outros não acessam. Isso protege o `.env` com
> os segredos gerados pelo instalador.

Se preferir instalar em outra pasta (por exemplo, `~/pdlpro`), crie-a da
mesma forma e passe `--dir ~/pdlpro` ao instalador:

```bash
mkdir -p ~/pdlpro
chmod 750 ~/pdlpro
```

> **Docker não instalado?** Adicione `--install-docker` ao comando do passo 1
> e o próprio script instala o Docker Engine via `get.docker.com`. Ao fim
> da instalação você verá um aviso para rodar `newgrp docker` (ou abrir uma
> nova sessão SSH) para aplicar o grupo sem reiniciar o servidor.

### 1. Instalar a aplicação

```bash
curl -fsSL https://github.com/D3NKYT0/pdlpro/releases/latest/download/install.sh -o install.sh
bash install.sh --dir /opt/pdlpro --domain seudominio.com --yes
```

Se o Docker ainda não estiver instalado, adicione `--install-docker`:

```bash
bash install.sh --dir /opt/pdlpro --domain seudominio.com --yes --install-docker
```

Sem `--yes` o script pergunta o domínio e pede confirmação. `--dir`, `--port`
e `--no-start` existem se precisar mudar pasta, porta interna ou só preparar o
`.env` sem subir os containers.

O que o instalador faz: baixa o ZIP, preenche o `.env` (segredos, Redis e
imagens), puxa `backend` e `web` do GHCR e sobe o Compose de produção. A senha
do Redis entra no `.env` **antes** do primeiro `docker compose`.

Como conferir:

```bash
cd /opt/pdlpro
docker compose --env-file .env -f docker-compose.prod.yml ps
```

`web`, `backend`, `db` e `redis` precisam estar no ar. O painel responde em
`http://127.0.0.1:8080` nesta máquina.

### 2. Ligar o HTTPS

O DNS já precisa apontar para este servidor. Na pasta da instalação:

```bash
cd /opt/pdlpro
./setup.sh nginx --yes --ssl --email voce@seudominio.com
```

Um comando, um arquivo de site (`/etc/nginx/sites-available/pdlpro`). Ele
instala o Nginx da distro, emite Let's Encrypt com `certbot certonly --webroot`
(sem reescrever o site) e encaminha o domínio para `127.0.0.1:8080` — HTTP,
HTTPS e WebSocket.

Sem `--yes` o script pergunta domínio, porta, `www` e SSL. `--domain` e
`--port` vêm do `.env` se você omitir. Ajuda: `./setup.sh help nginx`.

Se o proxy estiver em **outra** máquina, não rode este comando lá: aponte esse
proxy para `http://IP_PRIVADO_DO_PDL:8080` com `Host`, `X-Forwarded-For`,
`X-Forwarded-Proto: https` e upgrade de WebSocket.

Como conferir: o navegador abre `https://seudominio.com` sem aviso de
certificado.

### 3. Criar o administrador

```bash
cd /opt/pdlpro
docker compose --env-file .env -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

O Django pede usuário, e-mail e senha. Essa conta entra no Django Admin e no
painel staff. Depois abra `https://seudominio.com/admin/`.

### 4. Conferir se está no ar

No navegador, ou com `curl` no servidor:

- `https://seudominio.com/api/v1/system/health/`
- `https://seudominio.com/api/v1/system/version/`

A version deve ser a da latest que o instalador baixou.

### 5. Launcher por FTP (opcional)

Um comando e um `vsftpd.conf`. Sem flags o assistente pergunta pasta, usuário
e senha.

```bash
cd /opt/pdlpro
./setup.sh ftp --yes --http --domain launcher.seudominio.com --ssl --email voce@seudominio.com
```

`--http` publica `/var/www/launcher` com index no Nginx (`pdlpro-launcher`),
sem misturar com o site do painel. `--yes` sem `--password-file` gera a senha
e mostra uma vez no final. FTPS: `--ftps`. Ajuda: `./setup.sh help ftp`.

O DNS de `launcher.seudominio.com` também precisa apontar para este
servidor. Abra as portas `21` e a faixa passiva `40000-50000` no firewall.

## Windows

Pré-requisito: Docker Desktop em execução. Git Bash é opcional: quando existe,
o instalador reutiliza o `setup.sh`; senão, usa `scripts/configure-production.ps1`
e o `docker compose` nativo.

### 0. Criar a pasta de instalação

O instalador usa `%LOCALAPPDATA%\PDL\PRO` por padrão. Crie-a antes de rodar
o script (o PowerShell não reclama se já existir):

```powershell
New-Item -ItemType Directory -Force -Path "$env:LOCALAPPDATA\PDL\PRO"
```

Se quiser outra pasta, passe `-InstallDir` ao instalador e crie-a
da mesma forma:

```powershell
New-Item -ItemType Directory -Force -Path "C:\PDL\PRO"
```

### 1. Instalar a aplicação

```powershell
Invoke-WebRequest -UseBasicParsing `
  -Uri https://github.com/D3NKYT0/pdlpro/releases/latest/download/install.ps1 `
  -OutFile install.ps1
powershell -File .\install.ps1 -Domain seudominio.com -Yes
```

Pasta padrão: `%LOCALAPPDATA%\PDL\PRO`. Também aceita `-InstallDir`, `-Port` e
`-NoStart`.

`./setup.sh nginx` e `./setup.sh ftp` são do Ubuntu da máquina. No Windows o
HTTPS costuma ficar no Cloudflare ou em outro proxy na frente de
`http://IP:8080`. O administrador e o health usam o mesmo `docker compose`
acima, a partir da pasta da instalação.

## Atualizar

Backup → rode o instalador de novo no **mesmo diretório**. Sem `--version` ele
instala a latest. O `.env` existente é preservado; só as imagens mudam.

```bash
cd /opt/pdlpro
./setup.sh backup
curl -fsSL https://github.com/D3NKYT0/pdlpro/releases/latest/download/install.sh -o install.sh
bash install.sh --dir /opt/pdlpro --domain seudominio.com --yes
```

Não misture um clone Git (imagens `pdl_*:local`) com um diretório instalado
por release sem revisar `PDL_BACKEND_IMAGE`, `PDL_WEB_IMAGE` e
`PDL_IMAGE_PULL_POLICY`. Quem precisa voltar a buildar a partir do código
segue [Implantação avançada](implantacao.md).

## Comandos do dia a dia

Tudo na pasta da instalação (`cd /opt/pdlpro`). `./setup.sh list` mostra o
catálogo; `./setup.sh help <comando>` a ajuda de cada um.

| Quero | Comando |
| --- | --- |
| Ver os containers | `docker compose --env-file .env -f docker-compose.prod.yml ps` |
| Ver logs | `docker compose --env-file .env -f docker-compose.prod.yml logs --tail=100 web backend` |
| Criar o admin | `docker compose --env-file .env -f docker-compose.prod.yml exec backend python manage.py createsuperuser` |
| Ligar HTTPS | `./setup.sh nginx --yes --ssl --email voce@seudominio.com` |
| Ligar o FTP do launcher | `./setup.sh ftp --yes --http --domain launcher.seudominio.com --ssl --email voce@seudominio.com` |
| Backup do PostgreSQL | `./setup.sh backup` |
| Restaurar um dump | `./setup.sh restore --path backups/db/ARQUIVO.dump.enc` |

## Se algo falhar

| Sintoma | Onde olhar |
| --- | --- |
| `REDIS_PASSWORD is required` num ZIP antigo | [Solução de problemas](solucao-de-problemas.md#installsh-aborta-com-redis_password-is-required) |
| Certificado não emite | DNS `A`, portas 80/443 e `./setup.sh help nginx` |
| Site em HTTP, 502 ou WebSocket morto | Nginx da máquina apontando para `127.0.0.1:8080`; 8080 fechado na internet |
| FTP recusa login ou pasta vazia | `./setup.sh help ftp` e firewall 21 + 40000–50000 |

## O que cada release publica

| Artefato | Função |
| --- | --- |
| `ghcr.io/<repo>/backend:X.Y.Z` | API, ASGI e Celery |
| `ghcr.io/<repo>/web:X.Y.Z` | SPA compilada + Nginx interno |
| `pdl-pro-X.Y.Z.zip` | Compose sem build, `setup.sh`, scripts e `.env.example` |
| `pdl-pro-X.Y.Z.zip.sha256` | Checksum do ZIP |
| `install.sh` / `install.ps1` | Bootstrap Linux e Windows |

O ZIP **não** inclui o código-fonte. Imagens locais a partir do Git ficam
descritas em [Implantação avançada](implantacao.md).

## Fixar uma versão

O padrão é latest. `--version X.Y.Z` (Linux) ou `-Version X.Y.Z` (Windows)
existe para repetir uma tag já conhecida, por exemplo num rollback. Não use
isso no anúncio nem na instalação nova.

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
