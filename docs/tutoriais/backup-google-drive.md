# Tutorial: backup no Google Drive

[← Índice](../README.md) · [Fonte única](../projeto/fonte-unica.md) · [← Tutoriais](README.md) · [Backup e restauração](../operacao/backup-e-restauracao.md)

> **Atualizado:** 28 de setembro de 2026

Objetivo: o `./setup.sh backup` enviar todo dia, para uma pasta do seu Google Drive, o pacote
cifrado com banco, mídia, arquivos privados e `.env`, e permitir restaurar direto de lá.

O envio usa o [rclone](https://rclone.org/drive/). No servidor **não é preciso instalar
nada**: sem o `rclone` no host, os scripts usam a imagem Docker oficial. Você só instala o
rclone no **seu computador**, uma vez, para fazer o login no Google.

> [!IMPORTANT]
> Pré-requisitos: PDL PRO **2.6.4 ou mais novo** instalado pela
> [Release](../operacao/distribuicao.md), acesso SSH ao servidor e uma conta Google com
> espaço livre. Rode os comandos a partir da pasta da instalação (`/opt/pdlpro`).

## Visão geral

```text
servidor: ./setup.sh backup-cloud configure  ──►  mostra "rclone authorize ..."
seu PC:   rclone authorize ...  ──►  login no Google  ──►  imprime um token {...}
servidor: cola o token  ──►  destino gdrive:pdl-backups  ──►  teste automático
servidor: ./setup.sh backup-cloud schedule  ──►  backup diário às 03:30
```

O login acontece no seu PC porque o Google devolve a autorização para `127.0.0.1`, isto é, para
a própria máquina onde o navegador está. O servidor não tem navegador; por isso ele só recebe o
token pronto.

## 1. Guarde a chave de cifra fora do servidor

```bash
cd /opt/pdlpro
grep '^BACKUP_ENCRYPTION_KEY=' .env
```

Copie o valor para um cofre de senhas (Bitwarden, 1Password, KeePass…). Os backups no Drive são
cifrados com essa chave; se o servidor for perdido, **sem ela nada pode ser restaurado**. Se o
valor estiver vazio, rode `./scripts/configure-production.sh` antes de continuar: o envio para a
nuvem é recusado sem cifra.

## 2. Instale o rclone no seu computador

| Sistema | Comando |
| --- | --- |
| Windows (PowerShell) | `winget install Rclone.Rclone` e depois feche e reabra o PowerShell |
| macOS | `brew install rclone` |
| Linux | `sudo -v ; curl https://rclone.org/install.sh \| sudo bash` |

Confira com `rclone version`.

## 3. Crie o remote no servidor

```bash
cd /opt/pdlpro
./setup.sh backup-cloud configure
```

O assistente do rclone abre. Responda:

| Pergunta | Resposta |
| --- | --- |
| `e/n/d/r/c/s/q>` | `n` (novo remote) |
| `name>` | `gdrive` |
| `Storage>` | `drive` (ou o número de **Google Drive** na lista) |
| `client_id>` | **Enter** (vazio) |
| `client_secret>` | **Enter** (vazio) |
| `scope>` | `1` (acesso completo) |
| `service_account_file>` | Enter |
| `Edit advanced config?` | `n` |
| `Use web browser to automatically authenticate rclone with remote?` | **`n`** |

> [!WARNING]
> Nessa última pergunta a resposta é **`n`**. Com `y` o rclone fica esperando um navegador
> dentro do servidor (`Waiting for code...`) e o link `http://127.0.0.1:53682/...` que ele
> mostra **não abre no seu PC**. Se isso acontecer, `Ctrl+C` e recomece.

Deixar `client_id` e `client_secret` vazios usa o app do próprio rclone, já verificado pelo
Google: não aparece tela de aviso e o acesso não expira. O aviso de "low performance" se refere a
limites de requisição e não afeta um backup por dia. Para usar um client próprio, veja
[Client OAuth próprio](#client-oauth-próprio-opcional).

O servidor então mostra algo assim e fica esperando:

```text
Execute the following on the machine with the web browser (same rclone
version recommended):
        rclone authorize "drive" "eyJzY29wZSI6ImRyaXZlIn0"
Then paste the result.
config_token>
```

**Não feche esse terminal.**

## 4. Faça o login no seu computador

1. Copie **exatamente** a linha `rclone authorize "drive" "..."` que o servidor mostrou e rode no
   terminal do seu PC.
2. O navegador abre (se não abrir, acesse o link `http://127.0.0.1:53682/auth?...` impresso **no
   seu PC**). Entre com a conta Google que vai guardar os backups e clique em **Permitir**.
3. O navegador mostra *Success* e o terminal do PC imprime o resultado entre as setas:

```text
Paste the following into your remote machine --->
eyJjbGllbnRfaWQiOiIiLCJjbGllbnRfc2VjcmV0IjoiIiwidG9rZW4iOiJ7XCJhY2Nlc3Nf...
<---End paste
```

4. Copie a sequência inteira (começa com `eyJ`; versões antigas do rclone imprimem um
   `{"access_token":...}`, que também vale), sem as setas.

> [!CAUTION]
> Esse texto dá acesso ao seu Google Drive. Cole **somente** no terminal do servidor; nunca em
> chat, ticket, e-mail ou print. Se vazar, veja [Revogar o acesso](#revogar-ou-renovar-o-acesso).

## 5. Conclua no servidor

De volta ao terminal do servidor:

| Pergunta | Resposta |
| --- | --- |
| `config_token>` | cole o token copiado no passo 4 |
| `Configure this as a Shared Drive (Team Drive)?` | `n` (ou `y` para usar um Drive compartilhado do Workspace) |
| `Keep this "gdrive" remote?` | `y` |
| `e/n/d/r/c/s/q>` | `q` |
| `Destino dos backups [gdrive:pdl-backups]:` | **Enter** (aceita a sugestão) ou outro caminho, como `gdrive:backups/pdl` |

O script grava `BACKUP_REMOTE` no `.env` e testa escrita, listagem e remoção no Drive:

```text
[OK] BACKUP_REMOTE=gdrive:pdl-backups gravado em /opt/pdlpro/.env
[INFO] Testando escrita, listagem e remoção em gdrive:pdl-backups...
[OK] Destino gdrive:pdl-backups pronto para receber backups.
```

A pasta `pdl-backups` é criada sozinha no Drive. Se o remote `gdrive` já existir (por exemplo,
depois de uma tentativa anterior), basta apontar o destino sem abrir o assistente:

```bash
./setup.sh backup-cloud configure --remote gdrive:pdl-backups
```

## 6. Agende o backup diário

```bash
./setup.sh backup-cloud schedule --time 03:30
```

Como root em um servidor com systemd, isso instala o timer `pdl-backup.timer`:

```text
[OK] Timer systemd pdl-backup.timer ativo: backup diário às 03:30 (fuso do servidor).
```

Sem systemd, o comando grava uma linha no crontab. O horário segue o fuso do servidor
(`timedatectl` mostra qual é). Para trocar, rode o `schedule` de novo com outro `--time`.

## 7. Faça o primeiro backup e confira

```bash
./setup.sh backup
./setup.sh backup-cloud list
./setup.sh backup-cloud status
```

O `backup` mostra o tamanho do pacote e a barra de progresso do envio e termina com
`[OK] Backup enviado para a nuvem.`. O `status` deve ficar assim:

```text
Destino na nuvem : gdrive:pdl-backups
Arquivos (mídia) : true
Retenção         : 7 diários, 4 semanais
Horário          : 03:30
Último local     : pdl_20260928T225655Z.tar.enc
Último na nuvem  : pdl_20260928T225655Z.tar.enc
Agendamento      : systemd (pdl-backup.timer ativo)
```

No Drive aparecem o `pdl_<data>.tar.enc` e o `.sha256`. Para conferir o conteúdo do pacote sem
gravar nada decifrado no disco:

```bash
F=$(ls -1 backups/db/pdl_*.tar.enc | tail -n 1)
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in "$F" \
  -pass pass:"$(grep '^BACKUP_ENCRYPTION_KEY=' .env | cut -d= -f2-)" | tar -tf -
```

A lista deve ter `db.dump`, `env`, `files.tar.gz` e `manifest.txt`.

## 8. No dia seguinte

```bash
systemctl list-timers pdl-backup.timer
journalctl -u pdl-backup.service --since yesterday
./setup.sh backup-cloud list
```

O journal mostra cada execução, com uma linha de estatística do envio por minuto. Um backup novo
por dia deve aparecer no `list`. A retenção mantém o mais recente de cada um dos últimos 7 dias e
das últimas 4 semanas (`BACKUP_KEEP_DAILY` / `BACKUP_KEEP_WEEKLY` no `.env`).

## Restaurar a partir do Drive

```bash
./setup.sh restore --from-cloud                                  # último backup
./setup.sh restore --from-cloud pdl_20260928T033000Z.tar.enc     # um backup específico
```

O arquivo é baixado, o checksum é conferido e, após confirmação, banco, mídia e arquivos
privados são substituídos. Faça o primeiro ensaio numa instalação de teste. Para montar um
**servidor novo** a partir do Drive (incluindo o `.env` antigo), siga
[Servidor novo](../operacao/backup-e-restauracao.md#servidor-novo-recuperação-de-desastre).

## Revogar ou renovar o acesso

Se o token ou o `.rclone/rclone.conf` vazarem, ou se o Google passar a responder `invalid_grant`:

1. Em [myaccount.google.com/permissions](https://myaccount.google.com/permissions), remova o
   acesso do **rclone**.
2. No servidor, rode `./setup.sh backup-cloud configure` e responda: `e` (editar) → `gdrive` →
   Enter em todas as opções até `Already have a token - refresh?` → `y` → navegador `n`.
3. Repita os passos [4](#4-faça-o-login-no-seu-computador) e
   [5](#5-conclua-no-servidor) (no destino, Enter mantém `gdrive:pdl-backups`).
4. Confirme com `./setup.sh backup-cloud test`.

O token fica só em `.rclone/rclone.conf` (permissão 600, fora do Git e fora do pacote de backup).

## Client OAuth próprio (opcional)

Só vale a pena se você quiser a cota de requisições separada. No
[Google Cloud Console](https://console.cloud.google.com/):

1. Crie um projeto e ative a **Google Drive API**.
2. Em **Tela de consentimento OAuth**, escolha *Externo*, preencha o básico e **publique o app**
   (status *Em produção*). Em modo *Teste* o Google invalida o token a cada **7 dias** e o
   backup agendado para de funcionar.
3. Em **Credenciais → Criar credenciais → ID do cliente OAuth**, escolha **App para
   computador**. Não use *Aplicativo da Web*: ele não aceita o retorno para `127.0.0.1` e o login
   falha com `redirect_uri_mismatch`.
4. Use o `client_id` e o `client_secret` gerados no passo [3](#3-crie-o-remote-no-servidor). No
   login aparece "O Google não verificou este app": clique em **Avançado → Acessar**.

Trate o `client_secret` como senha: não o cole em chats nem em tickets.

## Problemas comuns

| Sintoma | Causa e solução |
| --- | --- |
| Servidor parado em `Waiting for code...` | Respondeu `y` na autenticação pelo navegador. `Ctrl+C` e refaça respondendo `n` |
| O link `http://127.0.0.1:53682/...` não abre | Ele foi gerado pelo **servidor**; o link válido é o que o `rclone authorize` imprime **no seu PC** |
| `Erro 400: redirect_uri_mismatch` | Client OAuth do tipo *Aplicativo da Web*. Deixe `client_id` vazio ou crie um do tipo *App para computador* |
| "O Google não verificou este app" | Client próprio não verificado. **Avançado → Acessar**, ou use o client vazio |
| Funcionou por uma semana e parou (`invalid_grant`) | Client próprio em modo *Teste*. Publique o app e [renove o acesso](#revogar-ou-renovar-o-acesso) |
| `BACKUP_REMOTE precisa ter o formato remote:caminho` | Destino vazio (versões anteriores à 2.6.4). Rode `./setup.sh backup-cloud configure --remote gdrive:pdl-backups` |
| `defina BACKUP_ENCRYPTION_KEY antes de enviar backups` | `.env` sem chave de cifra. Gere com `./scripts/configure-production.sh` e guarde no cofre |
| `backup local concluído, mas o envio para a nuvem falhou` | Rede, cota ou token. A cópia local foi mantida; rode `./setup.sh backup-cloud test` para ver o erro do rclone |
| `storageQuotaExceeded` | Drive cheio. Libere espaço ou reduza `BACKUP_KEEP_DAILY` / `BACKUP_KEEP_WEEKLY` |
| Backups antigos ainda ocupam espaço | O rclone manda os removidos pela retenção para a **lixeira** do Drive, que se esvazia em 30 dias. Para apagar direto, acrescente `use_trash = false` na seção `[gdrive]` de `.rclone/rclone.conf` |

Voltar: [Tutoriais](README.md) · [Backup e restauração](../operacao/backup-e-restauracao.md).
