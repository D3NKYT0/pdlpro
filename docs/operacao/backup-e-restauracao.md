# Backup e restauração

[Índice](../README.md) · [Instalar (Release)](distribuicao.md) · [Segurança](../projeto/seguranca.md)

Os scripts operacionais são Bash e usam Docker Compose. Execute a partir da
**pasta da instalação** (Release em `/opt/pdlpro` ou clone, se for o caso).
Antes de qualquer restauração, confirme qual instalação e qual banco serão
afetados.

## O que o backup inclui

`setup.sh backup` chama [scripts/backup.sh](../../scripts/backup.sh), que exporta **somente o PostgreSQL do painel**, no formato custom do `pg_dump`. O comando não inclui mídia, `.env`, XMLs externos, banco Lineage, filas Redis ou arquivos externos à base. Portanto, ele não copia os arquivos dos temas instalados.

```bash
./setup.sh backup
./setup.sh backup --output-dir /caminho/seguro/backups
```

O destino padrão é `backups/db/`. Com `BACKUP_ENCRYPTION_KEY` definida, o arquivo final é
`pdl_<timestamp>.dump.enc` (AES-256-CBC, PBKDF2, 200000 iterações, via `openssl`). Sem a
chave, o desenvolvimento grava o `.dump` em claro e emite um aviso; produção recusa o backup
sem a chave. O script valida o catálogo do dump **antes** de cifrar, gera `.sha256` do arquivo
final e não substitui um ensaio de restauração.

O helper operacional escolhe o Compose de produção quando detecta seu serviço `web`; caso contrário, usa o Compose de desenvolvimento. Verifique a instalação e o arquivo `.env` antes de executar. `PDL_ENV_FILE` permite selecionar outro arquivo de ambiente para os scripts; não confunda isso com isolamento automático de todos os volumes e serviços.

## Plano completo de recuperação

| Dado | Como tratar |
| --- | --- |
| PostgreSQL do painel | Dump, checksum e restauração testada |
| Mídia | Cópia separada do volume/diretório de mídia, incluindo customs, uploads e `themes/` |
| Configuração e segredos | Cópia protegida fora do Git, com acesso restrito |
| XMLs externos | Versionamento ou cópia do diretório realmente configurado |
| Banco Lineage | Política própria do servidor do jogo; o script do PDL não o exporta |
| Versão do software | Revisão Git/imagem e versão das migrações associadas ao backup |

Defina frequência, retenção e armazenamento fora do servidor conforme o volume de alterações. O script não agenda backups e não aplica retenção. Em produção o dump sai cifrado; a chave `BACKUP_ENCRYPTION_KEY` precisa existir no `.env` da restauração (é gerada pelo configurador e não acompanha a rotação da `SECRET_KEY`). Um backup de banco contém dados de usuários e precisa de proteção compatível mesmo cifrado.

## Restaurar um dump

**A restauração substitui dados atuais.** Faça primeiro um ensaio em instalação isolada, com a versão de código correspondente e sem clientes ou integrações reais gravando dados.

```bash
./setup.sh restore --path /caminho/seguro/pdl_DATA.dump.enc
```

Prefira informar o arquivo. Sem `--path`, o script escolhe o `.dump.enc` (ou o `.dump`) mais recente em `backups/db/`. Arquivos cifrados exigem a mesma `BACKUP_ENCRYPTION_KEY` usada na geração; o dump em claro temporário some ao terminar. [restore.sh](../../scripts/restore.sh) verifica checksum quando disponível, confere o catálogo e solicita confirmação em terminal interativo. `--force` suprime essa confirmação e só deve entrar em uma automação que já tenha identificado o destino correto.

O comando usa `pg_restore --clean --if-exists` e pausa os serviços ativos `backend`, `asgi` e `celery_worker` que identifica. Ele não coordena automaticamente todas as possíveis réplicas, agendas ou produtores externos; suspenda as fontes adicionais de escrita antes de uma recuperação. Não há garantia de restauração atômica se o `pg_restore` falhar no meio.

## Conferência após restauração

1. Verifique a conclusão do comando e os logs do banco e da aplicação.
2. Restaure a mídia correspondente e confira arquivos utilizados por registros recuperados.
3. Confirme versão, migrações, health check e autenticação no ambiente isolado.
4. Confira amostras de usuários, pedidos, saldos, extratos, inventários e configurações.
5. Registre revisão, data do backup, destino e resultado do ensaio.

Os pacotes de portabilidade LGPD ficam em `PRIVATE_MEDIA_ROOT` (volume `private_files` em
produção), fora de `MEDIA_ROOT`, **cifrados em disco** com `PDL_DATA_ENCRYPTION_KEY`. A view de
download devolve o gzip em claro depois de decifrar. Copie esse diretório junto com a mídia
quando houver pedidos com link ainda válido; restaurar só o banco deixa o registro sem arquivo.
A chave Fernet da instalação precisa ser a mesma de quando o pacote foi gerado.

Os registros `ThemePackage` ficam no PostgreSQL, mas os arquivos ficam em
`MEDIA_ROOT/themes/`. Banco e mídia precisam pertencer ao mesmo ponto de recuperação;
restaurar apenas um deles pode deixar o tema ativo apontando para uma versão ausente. Se isso
ocorrer, restaure a mídia correspondente ou ative o default antes de reabrir a instalação.

Reverter o banco do painel sem reverter o jogo ou o provedor pode deixar operações externas posteriores ao backup sem correspondência local. Reconcilie recibos e pagamentos antes de reabrir escritas. Veja [Câmbio](../integracoes/cambio-painel-jogo.md) e [Pagamentos](../integracoes/pagamentos.md).
