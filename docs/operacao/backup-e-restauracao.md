# Backup e restauração

[← Índice](../README.md) · [Fonte única](../projeto/fonte-unica.md) · [Instalar (Release)](distribuicao.md) · [Segurança](../projeto/seguranca.md)

> **Atualizado:** 28 de setembro de 2026

Os scripts operacionais são Bash e usam Docker Compose. Execute a partir da
**pasta da instalação** (Release em `/opt/pdlpro` ou clone, se for o caso).
Antes de qualquer restauração, confirme qual instalação e qual banco serão
afetados.

## O que o backup inclui

`setup.sh backup` chama [scripts/backup.sh](../../scripts/backup.sh) e gera **um único
pacote** `pdl_<timestamp>.tar.enc` com:

| Conteúdo | Origem |
| --- | --- |
| `db.dump` | PostgreSQL do painel (`pg_dump` formato custom, validado com `pg_restore --list`) |
| `files.tar.gz` | `/app/media` (temas instalados, uploads, customs) e `/app/private` (pacotes LGPD) do container `backend` |
| `manifest.txt` | Formato (`pdl-backup/1`), data e versão do produto |

```bash
./setup.sh backup                    # banco + mídia + privados, envia para a nuvem se configurada
./setup.sh backup --db-only          # só o banco (pdl_<timestamp>.dump.enc, formato anterior)
./setup.sh backup --no-upload        # não envia para a nuvem nesta execução
./setup.sh backup --no-prune         # não aplica a retenção nesta execução
./setup.sh backup --output-dir /caminho/seguro/backups
```

O destino local padrão é `backups/db/`. O pacote é cifrado com `BACKUP_ENCRYPTION_KEY`
(AES-256-CBC, PBKDF2, 200000 iterações, via `openssl`) e recebe um `.sha256`. Sem a chave, o
desenvolvimento grava em claro com aviso; produção recusa o backup, e **nenhum arquivo em claro
é enviado para a nuvem**. `BACKUP_INCLUDE_FILES=false` faz o comando padrão voltar a copiar
só o banco.

Ficam de fora: `.env`, XMLs externos, banco Lineage, filas Redis e mídia servida por bucket
(`USE_S3=true`): nesse caso os arquivos já estão no provedor e o pacote leva só o que existir
no volume local. Uma trava (`backups/db/.pdl-backup.lock`) impede que o agendamento e uma
execução manual, ou um restore, rodem ao mesmo tempo.

O helper operacional escolhe o Compose de produção quando detecta seu serviço `web`; caso contrário, usa o Compose de desenvolvimento. `PDL_ENV_FILE` seleciona outro arquivo de ambiente para os scripts; não confunda isso com isolamento automático de volumes e serviços.

## Backup na nuvem (Google Drive, R2, S3 e outros)

O envio usa o [rclone](https://rclone.org/overview/), que cobre Google Drive, Cloudflare R2,
Amazon S3, Backblaze B2, Wasabi, MinIO, OneDrive, Dropbox, SFTP, WebDAV e outros. O `rclone`
do host é usado quando instalado; senão os scripts rodam a imagem `rclone/rclone` pelo Docker,
sem instalar nada. A configuração fica em `.rclone/rclone.conf` (permissão 600, fora do Git).

### Cloudflare R2 ou S3 (sem assistente)

```bash
PDL_BACKUP_SECRET_ACCESS_KEY='<secret>' ./setup.sh backup-cloud configure \
  --provider r2 --bucket meus-backups --prefix pdl \
  --access-key-id '<access key id>' \
  --endpoint https://<account-id>.r2.cloudflarestorage.com
```

Para S3 use `--provider s3` com `--region` (AWS) ou `--endpoint` (Wasabi, MinIO e outros S3
compatíveis). Sem `PDL_BACKUP_SECRET_ACCESS_KEY` nem `--secret-access-key`, a chave é pedida sem
eco, para não ficar no histórico do shell. Crie o token com permissão só de leitura e escrita
no bucket; o bucket precisa existir.

### Google Drive e outros provedores (assistente)

```bash
./setup.sh backup-cloud configure
```

O assistente do rclone cria o remote (por exemplo `gdrive`) e o script pergunta o destino
(`gdrive:pdl-backups`). Em um servidor sem navegador, responda **não** à pergunta de
autenticação automática e rode `rclone authorize "drive"` num computador com navegador; cole o
token mostrado de volta no assistente. Um remote já existente pode ser usado direto:
`./setup.sh backup-cloud configure --remote gdrive:pdl-backups`.

Ao final, o comando grava `BACKUP_REMOTE` no `.env` e testa escrita, listagem e remoção no
destino (`./setup.sh backup-cloud test` repete o teste). Depois disso, todo `./setup.sh backup`
envia o pacote e o `.sha256`. Se o envio falhar, a cópia local é mantida e o comando termina com
erro, para o agendamento registrar a falha.

**Guarde `BACKUP_ENCRYPTION_KEY` fora do servidor** (cofre de senhas). Se o servidor for
perdido, é ela que permite abrir os backups da nuvem.

### Retenção e agendamento

```bash
./setup.sh backup-cloud schedule --time 03:30   # backup diário
./setup.sh backup-cloud status                  # destino, retenção, últimos backups, agenda
./setup.sh backup-cloud list                    # backups na nuvem, mais recente primeiro
./setup.sh backup-cloud unschedule
```

Como root em um host com systemd, `schedule` instala `pdl-backup.service` e `pdl-backup.timer`
(`Persistent=true`: roda ao ligar se o horário passou com a máquina desligada; logs em
`journalctl -u pdl-backup.service`). Sem systemd, grava uma linha marcada no crontab do usuário,
com saída para o `logger` (syslog). O horário segue o fuso do servidor e fica em
`BACKUP_SCHEDULE_TIME`.

Após cada backup, a retenção mantém o mais recente de cada um dos últimos
`BACKUP_KEEP_DAILY` dias (padrão 7) e de cada uma das últimas `BACKUP_KEEP_WEEKLY` semanas
(padrão 4), localmente e na nuvem; os demais `pdl_*` e seus `.sha256` são apagados. Outros
arquivos da pasta ou do bucket não são tocados. Para regras mais longas (mensais, bloqueio de
objeto), use também a política de ciclo de vida ou versionamento do provedor.

## Plano completo de recuperação

| Dado | Como tratar |
| --- | --- |
| PostgreSQL do painel | Pacote do `setup.sh backup`, checksum e restauração testada |
| Mídia e arquivos privados | No mesmo pacote (volumes locais); com `USE_S3=true`, versionamento do bucket |
| Configuração e segredos | Cópia protegida do `.env` fora do Git, com acesso restrito |
| XMLs externos | Versionamento ou cópia do diretório realmente configurado |
| Banco Lineage | Política própria do servidor do jogo; o script do PDL não o exporta |
| Versão do software | Versão do produto registrada no `manifest.txt` e imagem correspondente |

A chave `BACKUP_ENCRYPTION_KEY` precisa existir no `.env` da restauração (é gerada pelo
configurador e não acompanha a rotação da `SECRET_KEY`); chaves antigas podem ficar em
`BACKUP_ENCRYPTION_KEY_FALLBACKS`. Um backup contém dados de usuários e precisa de proteção
compatível mesmo cifrado.

## Restaurar

**A restauração substitui dados atuais.** Faça primeiro um ensaio em instalação isolada, com a versão de código correspondente e sem clientes ou integrações reais gravando dados.

```bash
./setup.sh restore --from-cloud                          # último backup da nuvem
./setup.sh restore --from-cloud pdl_20260928T033000Z.tar.enc
./setup.sh restore --path /caminho/seguro/pdl_DATA.tar.enc
./setup.sh restore --db-only                             # só o banco; mídia atual é mantida
```

Sem `--path` nem `--from-cloud`, o script usa o `pdl_*` mais recente em `backups/db/`. Com
`--from-cloud`, o arquivo e o `.sha256` são baixados para `backups/db/` e o checksum é
**obrigatório**: um download corrompido é recusado antes de qualquer alteração. Pacotes
`.tar(.enc)` e dumps antigos `.dump(.enc)` são aceitos. Para restaurar em um servidor novo,
instale a Release, copie `BACKUP_ENCRYPTION_KEY` para o `.env`, rode
`./setup.sh backup-cloud configure` com o mesmo destino e depois o restore.

[restore.sh](../../scripts/restore.sh) confere o manifesto e o catálogo do dump, solicita
confirmação em terminal interativo (`--force` suprime a pergunta e só deve entrar em automação
que já identificou o destino), pausa os serviços ativos `backend`, `asgi` e `celery_worker`,
aplica `pg_restore --clean --if-exists` e, se o pacote tiver arquivos, **substitui** o conteúdo
de `media/` e `private/` pelo do backup. Os serviços voltam ao final, mesmo em caso de erro. Ele
não coordena réplicas, agendas ou produtores externos; suspenda as fontes adicionais de escrita
antes de uma recuperação. Não há garantia de restauração atômica se o `pg_restore` falhar no
meio.

## Conferência após restauração

1. Verifique a conclusão do comando e os logs do banco e da aplicação.
2. Confira temas, uploads e arquivos usados por registros recuperados (ou restaure o bucket, com `USE_S3=true`).
3. Confirme versão, migrações, health check e autenticação no ambiente isolado.
4. Confira amostras de usuários, pedidos, saldos, extratos, inventários e configurações.
5. Registre revisão, data do backup, destino e resultado do ensaio.

Os pacotes de portabilidade LGPD ficam em `PRIVATE_MEDIA_ROOT` (volume `private_files` em
produção), **cifrados em disco** com `PDL_DATA_ENCRYPTION_KEY`; a chave Fernet da instalação
precisa ser a mesma de quando o pacote foi gerado. Os registros `ThemePackage` ficam no
PostgreSQL e os arquivos em `MEDIA_ROOT/themes/`: com `--db-only`, banco e mídia podem deixar de
pertencer ao mesmo ponto de recuperação e o tema ativo apontar para uma versão ausente. Nesse
caso, restaure o pacote completo ou ative o default antes de reabrir a instalação.

Reverter o banco do painel sem reverter o jogo ou o provedor pode deixar operações externas posteriores ao backup sem correspondência local. Reconcilie recibos e pagamentos antes de reabrir escritas. Veja [Câmbio](../integracoes/cambio-painel-jogo.md) e [Pagamentos](../integracoes/pagamentos.md).
