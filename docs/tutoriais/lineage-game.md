# Tutorial: Lineage 2 (MySQL e game)

[← Índice](../README.md) · [Fonte única](../projeto/fonte-unica.md) · [← Tutoriais](README.md) · [Lineage (técnica)](../integracoes/lineage.md) · [TLS MySQL](../integracoes/lineage-mysql-ssl.md)

> **Atualizado:** 25 de setembro de 2026

[Configurador admin](../operacao/integracoes-admin.md)

Objetivo: o painel lê/escreve no MySQL do jogo e mostra status do servidor.
Aba **Lineage / Game**.

## Rede

- A VPS do PDL precisa alcançar o host MySQL do L2 (porta, firewall, bind).
- Não exponha o MySQL na internet pública; use rede privada ou VPN.
- Usuário MySQL com permissões mínimas do dialeto (veja o guia Lineage).

## Campos principais

| Campo | Função |
| --- | --- |
| `LINEAGE_DB_ENABLED` | Liga a integração |
| `LINEAGE_DB_HOST` / `PORT` / `NAME` / `USER` / `PASSWORD` | Conexão |
| `LINEAGE_QUERY_MODULE` | Dialeto/fork (catálogo de queries) |
| `LINEAGE_PASSWORD_ALGO` | Algoritmo de senha do login L2 |
| `LINEAGE_DB_SSL*` | TLS — detalhe em [TLS MySQL](../integracoes/lineage-mysql-ssl.md) |
| `GAME_SERVER_IP` / `GAME_SERVER_PORT` / `LOGIN_SERVER_PORT` | Status online |
| `FAKE_PLAYERS_*` | Multiplicador/teto exibido no contador (opcional) |

Salve → **Testar** (TCP/MySQL). O hot-apply reinicia o engine SQLAlchemy.

## Conferir

1. Status do servidor na home / painel.
2. Vincular conta L2 com senha do jogo (ou fluxo de e-mail, conforme a
   instalação).
3. Operação somente leitura (personagens) antes de liberar serviços que
   escrevem no inventário.

## Problemas comuns

| Sintoma | Causa |
| --- | --- |
| Teste falha | host/porta, usuário, bind do MySQL, firewall |
| SSL fail | CA/caminho — [TLS](../integracoes/lineage-mysql-ssl.md) |
| Queries vazias / erro SQL | `LINEAGE_QUERY_MODULE` errado para o fork |

Voltar: [Tutoriais](README.md).
