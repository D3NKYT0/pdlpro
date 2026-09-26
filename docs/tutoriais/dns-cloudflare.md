# Tutorial: DNS e Cloudflare

[← Tutoriais](README.md) · [Instalar (Release)](../operacao/distribuicao.md)

Objetivo: o domínio `seudominio.com` aponta para a VPS e o HTTPS funciona com
o `./setup.sh nginx` da Release.

## O que o PDL espera

1. Registro DNS `A` (e `AAAA` só se o IPv6 do servidor funcionar) para o
   mesmo host que você passou em `--domain` no instalador.
2. Portas `80` e `443` abertas na VPS.
3. Nginx da máquina terminando TLS e encaminhando para `127.0.0.1:8080`
   (Compose). **Não publique 8080 na internet.**

## Sem Cloudflare (DNS simples)

No registrador do domínio:

| Tipo | Nome | Conteúdo |
| --- | --- | --- |
| `A` | `@` (ou `seudominio.com`) | IPv4 da VPS |
| `A` | `www` (opcional) | mesmo IPv4 |
| `AAAA` | `@` | só se o IPv6 da VPS funcionar de ponta a ponta |

Espere a propagação (minutos a algumas horas). Depois:

```bash
cd /opt/pdlpro
./setup.sh nginx --yes --ssl --email voce@seudominio.com
```

Confira `https://seudominio.com` e
`https://seudominio.com/api/v1/system/health/`.

## Com Cloudflare

### 1. Apontar o domínio

1. Crie a zona do domínio no Cloudflare.
2. Troque os nameservers no registrador para os que o Cloudflare indicar.
3. Crie o registro:

| Tipo | Nome | Conteúdo | Proxy |
| --- | --- | --- | --- |
| `A` | `@` | IPv4 da VPS | veja abaixo |
| `A` | `www` | IPv4 da VPS | igual ao `@` |

### 2. Proxy laranja × DNS only (cinza)

O instalador emite certificado com **Let's Encrypt + HTTP-01** no Nginx da
VPS (`certbot certonly --webroot`).

| Situação | Recomendação |
| --- | --- |
| Primeira emissão do certificado | Deixe o registro em **DNS only** (nuvem cinza), rode `./setup.sh nginx --yes --ssl …`, confirme HTTPS na origem |
| Depois do certificado ok | Pode ligar o proxy (nuvem laranja) se quiser CDN/WAF |
| Proxy já laranja e o certbot falha | Desligue o proxy temporariamente, emita o cert, religue |

Com proxy laranja ativo:

- SSL/TLS no Cloudflare: **Full** ou **Full (strict)** — nunca **Flexible**
  (Flexible quebra cookies `Secure` e misturam HTTP na origem).
- Ative **WebSockets** (Network → WebSockets) — o painel usa `/ws/`.
- Não force regras que bloqueiem `/.well-known/acme-challenge/` se for renovar
  o certificado na origem.

### 3. Launcher em subdomínio (opcional)

Se usar `./setup.sh ftp --http --domain launcher.seudominio.com`:

1. Crie `A` `launcher` → mesmo IPv4.
2. Mesma lógica de proxy/cinza na primeira emissão do cert do launcher.

## Conferir

```bash
# Do seu PC ou da VPS
curl -fsS https://seudominio.com/api/v1/system/health/
curl -fsS https://seudominio.com/api/v1/system/version/
```

No navegador: cadeado válido, login abre, e uma tela que use WebSocket (se
houver) não cai a conexão.

## Problemas comuns

| Sintoma | Causa típica |
| --- | --- |
| Certbot “connection refused” / timeout | DNS ainda não aponta, firewall 80 fechado, ou proxy laranja bloqueando HTTP-01 |
| 525 / 526 no Cloudflare | SSL Flexible ou certificado inválido na origem — use Full/Full strict |
| Site ok, API/WebSocket falha atrás do CF | WebSockets desligado ou regra de WAF |
| Abre pelo IP:8080 mas não pelo domínio | Nginx da máquina não configurado — rode `./setup.sh nginx` |

Voltar: [Tutoriais](README.md).
