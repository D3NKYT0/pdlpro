# Backup e restauração

[Índice](../README.md) · [Implantação](implantacao.md) · [Segurança](../projeto/seguranca.md)

Os scripts operacionais são Bash e usam Docker Compose. Execute a partir da raiz do projeto em um ambiente preparado para esses scripts. Antes de qualquer restauração, confirme qual instalação e qual banco serão afetados.

## O que o backup inclui

`setup.sh backup` chama [scripts/backup.sh](../../scripts/backup.sh), que exporta **somente o PostgreSQL do painel**, no formato custom do `pg_dump`. O comando não inclui mídia, `.env`, XMLs externos, banco Lineage, filas Redis ou arquivos externos à base. Portanto, ele não copia os arquivos dos temas instalados.

```bash
./setup.sh backup
./setup.sh backup --output-dir /caminho/seguro/backups
```

O destino padrão é `backups/db/`. O script gera um arquivo com timestamp UTC, verifica se não está vazio e valida seu catálogo com `pg_restore --list`. Também cria um arquivo `.sha256` quando existe utilitário SHA-256 disponível. Essa validação estrutural não substitui um ensaio de restauração.

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

Defina frequência, retenção e armazenamento fora do servidor conforme o volume de alterações. O script não agenda backups, não aplica retenção e não cifra o dump. Um backup de banco contém dados de usuários e precisa de proteção compatível.

## Restaurar um dump

**A restauração substitui dados atuais.** Faça primeiro um ensaio em instalação isolada, com a versão de código correspondente e sem clientes ou integrações reais gravando dados.

```bash
./setup.sh restore --path /caminho/seguro/pdl_DATA.dump
```

Prefira informar o arquivo. Sem `--path`, o script escolhe o `.dump` mais recente em `backups/db/`. [restore.sh](../../scripts/restore.sh) verifica checksum quando disponível, confere o catálogo e solicita confirmação em terminal interativo. `--force` suprime essa confirmação e só deve entrar em uma automação que já tenha identificado o destino correto.

O comando usa `pg_restore --clean --if-exists` e pausa os serviços ativos `backend`, `asgi` e `celery_worker` que identifica. Ele não coordena automaticamente todas as possíveis réplicas, agendas ou produtores externos; suspenda as fontes adicionais de escrita antes de uma recuperação. Não há garantia de restauração atômica se o `pg_restore` falhar no meio.

## Conferência após restauração

1. Verifique a conclusão do comando e os logs do banco e da aplicação.
2. Restaure a mídia correspondente e confira arquivos utilizados por registros recuperados.
3. Confirme versão, migrações, health check e autenticação no ambiente isolado.
4. Confira amostras de usuários, pedidos, saldos, extratos, inventários e configurações.
5. Registre revisão, data do backup, destino e resultado do ensaio.

Os registros `ThemePackage` ficam no PostgreSQL, mas os arquivos ficam em
`MEDIA_ROOT/themes/`. Banco e mídia precisam pertencer ao mesmo ponto de recuperação;
restaurar apenas um deles pode deixar o tema ativo apontando para uma versão ausente. Se isso
ocorrer, restaure a mídia correspondente ou ative o default antes de reabrir a instalação.

Reverter o banco do painel sem reverter o jogo ou o provedor pode deixar operações externas posteriores ao backup sem correspondência local. Reconcilie recibos e pagamentos antes de reabrir escritas. Veja [Câmbio](../integracoes/cambio-painel-jogo.md) e [Pagamentos](../integracoes/pagamentos.md).
