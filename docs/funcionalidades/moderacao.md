# Moderação de personagens

[← Índice](../README.md) · [Fonte única](../projeto/fonte-unica.md)

> **Atualizado:** 25 de setembro de 2026

Em `/panel/admin`, acesse **Servidor → Moderação** (`/panel/admin/moderation`).
Esta é uma tela da SPA da equipe, não do Django Admin. A lista mostra
personagem, nick, conta L2, e-mail, nível e se está online, banido ou preso.
Ao escolher um registro, a ficha libera **kick**, **prender / soltar**,
**banir / desbanir** e **teleporte** para uma vila do catálogo Interlude.

A equipe autenticada com acesso staff (`IsStaffMember`) consome
`/api/v1/staff/moderation/`. As escritas entram no [audit log](../operacao/observabilidade.md)
automático das rotas `/staff/`. O histórico por personagem também fica no banco
do painel (`ModerationActionLog`) e na ficha.

## O que cada ação faz

Todas as escritas no Lineage passam pelo `ILineageGateway` e pelo SQL do
dialeto (`lucerav2`, `dreamv3`, `mobius`). Não há canal telnet/packet com o
gameserver: o painel altera o banco do jogo.

| Ação | Efeito | Personagem online |
| --- | --- | --- |
| Kick | `characters.online = 0` | A desconexão real depende do gameserver; o flag vale no próximo login |
| Prender | Move para as coordenadas da prisão GM e grava o motivo no painel | Entra na prisão no próximo login |
| Soltar | Limpa a prisão no painel e envia a Giran | Idem |
| Banir | `accessLevel` / `access_level` da **conta** = `-100` e kick | Impede o **próximo** login no loginserver |
| Desbanir | Restaura o access level da conta para `0` (jogador, não GM) | — |
| Teleporte | Atualiza `x,y,z` para a vila escolhida, sem cobrir carteira | Vale no próximo login se estiver online |

Prisão e banimento exigem motivo (3 a 255 caracteres). A duração da prisão é em
minutos; `0` permanece até um soltar. Prisões expiradas deixam de aparecer no
filtro **Presos**.

O catálogo SQL de moderação é opcional: se o dialeto ou o overlay da extensão
não publicar `search_moderation_characters` (e as escritas irmãs), a API
responde `available: false` e a tela informa a indisponibilidade. Forks
ajustam o SQL em
`backend/extensions/<cliente>/infrastructure/lineage/queries/<dialeto>/`.

## Desenvolvimento

- Backend: `apps/server/application/moderation_use_cases.py`, porta
  `ILineageGateway` / `IModerationStateRepository`, views em
  `apps/staff/presentation/views/moderation.py`.
- Frontend: `pages/admin/AdminModerationPage.tsx`,
  `components/admin/moderation/`, `staffModerationApi` em `services/api.ts`.
- Testes: `apps/staff/tests/test_staff_moderation.py` e
  `AdminModerationPage.test.tsx`.
