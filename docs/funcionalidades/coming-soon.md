# Coming Soon

[Índice](../README.md) · [Temas](temas.md) · [Painel e servidor](../desenvolvimento/interface-admin.md)

O Coming Soon substitui a home por uma **página de lançamento própria**, sem o chrome público
(nav/rodapé padrão ou portal). A equipe configura o modo em **Painel > Administração > Painel e
servidor**.

## Configuração

| Campo | Uso |
| --- | --- |
| Ativar Coming Soon | Liga a página de lançamento em `/` |
| Título | Headline da página |
| Subtítulo | Texto de apoio |
| Data e hora do lançamento | Alvo da contagem regressiva (obrigatória com o modo ativo) |
| Login apenas para staff | Bloqueia jogadores comuns no login |

A ativação sem data de lançamento é rejeitada pela API.

## Comportamento público

1. Visitantes em `/` veem a tela full-bleed com contagem regressiva.
2. O kicker fixo é “Em breve”; o hero usa o título de lançamento ou o nome do servidor.
3. Entrar é a ação principal; Downloads fica secundário.
4. Login e Downloads permanecem acessíveis pelos botões da página.
5. Outras rotas públicas (notícias, wiki, etc.) continuam com o layout normal.
6. Com restrição de staff, senha/passkey/OAuth/2FA respondem
   `COMING_SOON_LOGIN_RESTRICTED` para jogadores comuns.

No admin, com Coming Soon ativo, use **Ver página de lançamento** para abrir `/` em nova aba.

Quando a data chega, a contagem some e a página entra no estado de abertura: troca o fundo
para a arte de comemoração com fogos (`bg/coming-soon-open.png`), fogos de artifício animados
em loop, casal humano em Dynasty (`bg/dynasty-couple-dance.png`) na base do portal atrás do
painel semi-transparente, anel luminoso, kicker “Servidor aberto”, mensagem “O momento chegou”
e ênfase no botão Entrar. O Coming Soon continua ativo até a equipe desligar o modo no painel.

Contrato público em `GET /api/v1/public/server/info/`:

- `coming_soon`
- `coming_soon_title`
- `coming_soon_subtitle`
- `coming_soon_at` (ISO 8601 ou `null`)

Persistência em `IndexConfig` via `PUT /api/v1/staff/panel/`.

O countdown do hero nos temas `portal-v1` é independente: a página Coming Soon não reutiliza o
hero do tema.

## Validação

- Backend: `apps/server/tests/test_server_info.py`, `apps/staff/tests/test_staff_config_api.py`,
  login restrito em `apps/accounts/tests/test_auth_api.py`.
- Frontend: `ComingSoonPage.test.tsx`, `PublicLayout.test.tsx`, admin em `AdminSettings.test.tsx`.
- Manual: definir título/data, ativar Coming Soon, abrir `/` anônimo e conferir a contagem;
  tentar login de jogador com restrição de staff.
