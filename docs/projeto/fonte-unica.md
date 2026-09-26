# Fonte única (mapa canônico)

[← Índice](../README.md) · [Como manter a documentação](documentacao.md)

> **Atualizado:** 25 de setembro de 2026

> [!IMPORTANT]
> **Um assunto → um guia principal.** Os demais só resumem e linkam. Isso
> evita checklist duplicado e deixa a busca previsível.

## Mapa

| Assunto | Documento canônico | Não coloque em… |
| --- | --- | --- |
| Instalar / atualizar VPS | [Distribuição](../operacao/distribuicao.md) | Implantação avançada (exceto link) |
| Clone / build / topologia | [Implantação avançada](../operacao/implantacao.md) | Tutoriais de operador |
| Passo a passo de provedor | [Tutoriais](../tutoriais/README.md) | Guias técnicos longos |
| Hot-apply / abas / API staff | [Integrações admin](../operacao/integracoes-admin.md) | Tutoriais (só link) |
| Lista de variáveis | [Ambiente](../configuracao/ambiente.md) | Tutoriais (só campos usados) |
| Relato de vulnerabilidade | [Política](seguranca.md) | Issues públicas |
| Sessões, proxies, cookies, liquidação | [Segurança operacional](../operacao/seguranca.md) | Distribuição, temas, frontend |
| Soft-rotate / Fernet | [Rotação de segredos](../operacao/rotacao-de-segredos.md) | Integrações admin (só bootstrap) |
| Backup / restore | [Backup](../operacao/backup-e-restauracao.md) | — |
| Logs / Sentry ops | [Observabilidade](../operacao/observabilidade.md) | Tutorial Sentry (só setup) |
| Sintomas de instalação | [Problemas](../operacao/solucao-de-problemas.md) | — |
| Fluxo interno de pagamento | [Pagamentos](../integracoes/pagamentos.md) | Tutoriais MP/Stripe (setup) |
| Dialetos SQL L2 | [Lineage](../integracoes/lineage.md) | Tutorial Lineage (conexão) |
| Camadas backend/SPA | [Arquitetura](../arquitetura/visao-geral.md) + [Frontend](../desenvolvimento/frontend.md) | PDFs / scripts |
| Temas ZIP | [Temas](../funcionalidades/temas.md) | — |
| Economia (carteira/loja/MP/leilão) | [Economia do jogador](../funcionalidades/economia-jogador.md) | — |
| Testes (como rodar) | [Testes](../desenvolvimento/testes.md) | — |
| Testes (obrigatoriedade) | [Política](../desenvolvimento/politica-de-testes.md) | — |
| Versões publicadas | [Changelog](../historico/changelog.md) | `CHANGELOG.md` da raiz (só ponteiro) |
| Arquivo datado | [historico/](../historico/) | `desenvolvimento/` |
| Data de revisão | `> **Atualizado:**` no topo de cada guia vivo | Inventar data sem reler o código |

## Segurança

Há **dois** documentos de segurança, de propósito diferentes:

| Documento | Público | Conteúdo |
| --- | --- | --- |
| [projeto/seguranca.md](seguranca.md) | Todos | Como **reportar** falha; versões; agradecimentos |
| [operacao/seguranca.md](../operacao/seguranca.md) | Operadores / devs | Proxies, sessões, CSRF, liquidação, OpenAPI |

> [!WARNING]
> Não replique listas longas de hardening em Distribuição, Temas ou Frontend.
> Linke para [Segurança operacional](../operacao/seguranca.md).

## Formato visual (GitHub)

Use callouts oficiais — eles aparecem com cor no GitHub:

```markdown
> [!NOTE]
> Informação neutra.

> [!TIP]
> Atalho ou boa prática.

> [!IMPORTANT]
> Regra que o leitor não pode ignorar.

> [!WARNING]
> Risco operacional (dados, dinheiro, downtime).

> [!CAUTION]
> Perigo alto (perda de dados, exposição).
```

Evite emoji decorativo. Prefira tabelas curtas e links relativos.

## Extensões e apps

| App / área | Onde está documentado |
| --- | --- |
| `accounts` | API + segurança operacional + tutoriais OAuth/hCaptcha/WebAuthn |
| `payment` / `wallet` / `shop` | [Economia](../funcionalidades/economia-jogador.md) + [Pagamentos](../integracoes/pagamentos.md) |
| `auction` / `marketplace` | [Economia](../funcionalidades/economia-jogador.md) |
| `inventory` | [Câmbio](../integracoes/cambio-painel-jogo.md) |
| `games` / `programs` | [Programas e recompensas](../funcionalidades/programas-e-recompensas.md) |
| `content` / legais | [Legais](../funcionalidades/documentos-legais-e-lgpd.md) + API |
| `communication` | Tutoriais SMTP / VAPID |
| `support` / Ajuda | [Ajuda](../funcionalidades/ajuda.md) |
| `themes` | [Temas](../funcionalidades/temas.md) |
| `staff` | Integrações, moderação, observação, relatórios |
| `extensions/*` | [Extensões](../arquitetura/extensoes.md) |
