# TLS no MySQL do Lineage 2

[← Índice](../README.md) · [Integração Lineage](lineage.md) · [Variáveis de ambiente](../configuracao/ambiente.md)

O painel fala com o banco do jogo por TCP (`mysql+pymysql`). Sem TLS, usuário, senha e
SQL atravessam a rede em claro. A escolha é só de ambiente: o mesmo binário aceita
conexão simples ou TLS, sem recompilar.

Use **uma** destas opções no `.env`. O padrão do repositório é a opção A, para não
quebrar instalações que já apontam para `127.0.0.1` ou para um MySQL na mesma rede
Docker sem certificado.

## As duas opções

| Opção | Quando usar | Variáveis |
| --- | --- | --- |
| **A — sem TLS** (padrão) | MySQL no mesmo host, no mesmo Compose, ou em LAN que você trata como confiável | `LINEAGE_DB_SSL=false` |
| **B — com TLS** | MySQL em outro servidor, outra VPS, VPN frágil ou qualquer tráfego que saia da máquina do painel | `LINEAGE_DB_SSL=true` e, de preferência, um CA em `LINEAGE_DB_SSL_CA` |

A flag **não** liga sozinha quando o host é remoto. Se `LINEAGE_DB_HOST` não for
loopback, escolha B de propósito. Deixar A com host público expõe a senha do schema
do jogo.

```env
# Opção A — comportamento histórico
LINEAGE_DB_SSL=false

# Opção B — canal cifrado até o MySQL do jogo
LINEAGE_DB_SSL=true
LINEAGE_DB_SSL_VERIFY=true
LINEAGE_DB_SSL_CA=/run/secrets/lineage-mysql/ca.pem
LINEAGE_DB_SSL_CERT=
LINEAGE_DB_SSL_KEY=
```

| Variável | Efeito |
| --- | --- |
| `LINEAGE_DB_SSL` | `false`: `connect_args` vazio (TCP simples). `true`: PyMySQL abre TLS |
| `LINEAGE_DB_SSL_VERIFY` | `true`: exige certificado válido e hostname igual a `LINEAGE_DB_HOST`. `false`: cifra o canal e **não** valida o certificado |
| `LINEAGE_DB_SSL_CA` | Arquivo PEM da autoridade (ou da cadeia) que assinou o certificado do MySQL |
| `LINEAGE_DB_SSL_CERT` / `LINEAGE_DB_SSL_KEY` | Cliente mTLS, só se o MySQL exigir certificado do painel |

`LINEAGE_DB_SSL_VERIFY=false` ainda usa TLS. Serve para certificado autoassinado em
rede isolada, enquanto você não tem um CA. Não use isso através da internet.

O gateway lê essas variáveis em
[lineage_ssl.py](../../backend/apps/server/infrastructure/lineage_ssl.py) e passa
`connect_args` ao SQLAlchemy. Reinicie `backend`, `asgi` e `celery_worker` depois de
mudar o `.env`.

## Opção A — sem TLS

Deixe o bloco do `.env.example` como está:

```env
LINEAGE_DB_ENABLED=true
LINEAGE_DB_HOST=127.0.0.1
LINEAGE_DB_PORT=3306
LINEAGE_DB_SSL=false
```

Nada muda no `my.cnf` do jogo. Confirme só usuário, senha, dialeto e schema, como em
[Lineage 2](lineage.md).

## Opção B — com TLS

Há dois lados: o **servidor MySQL/MariaDB do jogo** precisa oferecer TLS; o **painel**
precisa confiar no certificado.

### 1. Certificado no MySQL do jogo

No servidor do jogo (não no container do PDL), gere um CA e um certificado cujo nome
coincida com o host que o painel usa em `LINEAGE_DB_HOST`.

Se o painel conecta em `mysql-l2.exemplo.com`:

```bash
mkdir -p /etc/mysql/ssl && cd /etc/mysql/ssl
openssl req -new -x509 -days 3650 -nodes -keyout ca-key.pem -out ca.pem \
  -subj "/CN=l2-mysql-ca"
openssl req -new -nodes -keyout server-key.pem -out server-req.pem \
  -subj "/CN=mysql-l2.exemplo.com"
openssl x509 -req -in server-req.pem -days 3650 -CA ca.pem -CAkey ca-key.pem \
  -set_serial 1 -out server-cert.pem
chmod 600 ca-key.pem server-key.pem
chown mysql:mysql /etc/mysql/ssl/*.pem
```

Se o painel conecta por IP (`203.0.113.10`), o certificado precisa de SAN com esse IP
(`subjectAltName=IP:203.0.113.10`). Sem isso, ou você aponta `LINEAGE_DB_HOST` para o
DNS do certificado, ou cai em `LINEAGE_DB_SSL_VERIFY=false`.

No `my.cnf` / `mariadb.conf.d`:

```ini
[mysqld]
ssl_ca=/etc/mysql/ssl/ca.pem
ssl_cert=/etc/mysql/ssl/server-cert.pem
ssl_key=/etc/mysql/ssl/server-key.pem
# Opcional, depois que o painel já conectar com TLS:
# require_secure_transport=ON
```

Reinicie o MySQL. Confira:

```sql
SHOW VARIABLES LIKE 'have_ssl';
SHOW VARIABLES LIKE 'ssl_ca';
```

`have_ssl` deve ser `YES`. Libere o usuário do painel só do endereço de origem real:

```sql
ALTER USER 'l2user'@'IP_DO_PAINEL' REQUIRE SSL;
FLUSH PRIVILEGES;
```

`REQUIRE X509` só entra se você for usar `LINEAGE_DB_SSL_CERT` e `LINEAGE_DB_SSL_KEY`.

Cópias de distribuições L2 antigas às vezes usam MariaDB sem pacote TLS. Instale
`mariadb-server` com OpenSSL e confirme `have_ssl` antes de ligar a flag no painel.

### 2. CA no host do painel

Copie **somente** `ca.pem` (a cadeia pública) para a máquina do PDL. Não copie
`ca-key.pem` nem a chave do servidor.

Na raiz do repositório (Compose de produção):

```text
secrets/lineage-mysql/ca.pem
```

Esse diretório está no Git só como pasta vazia; os PEM ficam fora do repositório.

No `.env` da instalação:

```env
LINEAGE_DB_ENABLED=true
LINEAGE_DB_HOST=mysql-l2.exemplo.com
LINEAGE_DB_SSL=true
LINEAGE_DB_SSL_VERIFY=true
LINEAGE_DB_SSL_CA=/run/secrets/lineage-mysql/ca.pem
```

No [docker-compose.prod.yml](../../docker-compose.prod.yml) os serviços `backend`,
`asgi` e `celery_worker` têm um volume comentado. Descomente o mesmo bloco nos três:

```yaml
volumes:
  - static_files:/app/staticfiles
  - media_files:/app/media
  - private_files:/app/private
  - ./secrets/lineage-mysql:/run/secrets/lineage-mysql:ro
```

Fora do Docker, aponte `LINEAGE_DB_SSL_CA` para o caminho absoluto no disco, por
exemplo `D:/certs/l2-ca.pem` no Windows ou `/etc/pdl/lineage-mysql-ca.pem` no Linux.

### 3. Conferir

1. Recrie os containers da aplicação (`./setup.sh deploy` ou `compose up -d` com o
   arquivo de produção).
2. No log do backend, uma falha de TLS aparece na primeira consulta ao jogo (status,
   ranking, vínculo de conta), não na subida do Gunicorn.
3. No MySQL: `SHOW STATUS LIKE 'Ssl_cipher';` na sessão do usuário do painel deve
   mostrar um conjunto não vazio (por exemplo `TLS_AES_256_GCM_SHA384`).
4. Com `LINEAGE_DB_SSL=false` essa cifra permanece vazia.

## Certificado autoassinado sem CA no painel

Enquanto o CA não está no container:

```env
LINEAGE_DB_SSL=true
LINEAGE_DB_SSL_VERIFY=false
LINEAGE_DB_SSL_CA=
```

O tráfego vai cifrado, mas qualquer certificado no destino é aceito. Trate como
provisório. Quando o `ca.pem` estiver montado, volte `LINEAGE_DB_SSL_VERIFY=true`.

## Cliente com certificado (mTLS)

Só se o MySQL estiver com `REQUIRE X509`:

```env
LINEAGE_DB_SSL=true
LINEAGE_DB_SSL_VERIFY=true
LINEAGE_DB_SSL_CA=/run/secrets/lineage-mysql/ca.pem
LINEAGE_DB_SSL_CERT=/run/secrets/lineage-mysql/client-cert.pem
LINEAGE_DB_SSL_KEY=/run/secrets/lineage-mysql/client-key.pem
```

Coloque os três arquivos em `secrets/lineage-mysql/` e mantenha a chave com
permissão restrita no host.

## Problemas frequentes

| Sintoma | Causa usual | O que fazer |
| --- | --- | --- |
| `(2003) Can't connect` | Firewall, bind do MySQL só em `127.0.0.1`, porta errada | Libere a origem do painel; `bind-address` precisa alcançar essa origem |
| `SSL connection error` / `CERTIFICATE_VERIFY_FAILED` | CA ausente ou cadeia incompleta | Monte `ca.pem`; confira se é o mesmo CA que assinou o servidor |
| Hostname mismatch | `LINEAGE_DB_HOST` é IP e o certificado é DNS, ou o contrário | Iguale host e SAN, ou use o DNS do certificado |
| Painel sobe, ranking/vínculo falha depois | TLS só é tentado na primeira query | Olhe o traceback SQLAlchemy/PyMySQL, não o health HTTP |
| `have_ssl = DISABLED` | Build do MySQL/MariaDB sem OpenSSL | Troque o pacote do servidor de jogo; o painel não consegue “forçar” TLS sozinho |
| Funcionava e quebrou após ligar `require_secure_transport` | Algum cliente interno do gameserver ainda conecta sem TLS | Libere esses clientes ou configure TLS também no loginserver/gameserver |

Desligar `LINEAGE_DB_SSL` devolve o comportamento anterior. Não existe migração de
dados: a flag só altera o transporte.

## O que esta flag não faz

- Não cifra o PostgreSQL do painel. Dumps do PDL usam `BACKUP_ENCRYPTION_KEY`; veja
  [Backup e restauração](../operacao/backup-e-restauracao.md).
- Não cifra TOTP nem exportações LGPD. Isso é `PDL_DATA_ENCRYPTION_KEY`.
- Não substitui firewall nem usuário MySQL restrito. TLS protege o caminho; a conta
  do schema continua precisando do menor privilégio descrito em
  [Variáveis de ambiente](../configuracao/ambiente.md).
