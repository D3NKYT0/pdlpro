# Coming Soon

[Índice](../README.md) · [Temas](temas.md) · [Painel e servidor](../desenvolvimento/interface-admin.md)

O Coming Soon substitui a página inicial por uma tela de lançamento enquanto o servidor ainda
não está aberto ao público. A equipe configura o modo em **Painel > Administração > Painel e
servidor**.

## Comportamento

1. Com **Ativar Coming Soon** ligado, visitantes veem a página de lançamento em `/`.
2. No tema default, a tela usa nome e descrição públicos do servidor.
3. Com renderer `portal-v1`, a home mostra somente o hero do tema (título, texto e countdown do
   `presentation.home.hero`).
4. Demais rotas públicas (notícias, downloads, login) continuam acessíveis.
5. Com **Permitir login apenas para staff** ligado junto com o Coming Soon, senha, passkey, OAuth
   e 2FA bloqueiam jogadores comuns (`COMING_SOON_LOGIN_RESTRICTED`). Staff, superusuário e
   membros de staff do painel entram normalmente.

A flag pública sai em `GET /api/v1/public/server/info/` como `coming_soon`. A administração
grava o valor em `IndexConfig` via `PUT /api/v1/staff/panel/`.

## Contagem regressiva

Não há data de lançamento separada no painel React. No portal Valorem, a data vem de
`presentation.home.hero.countdownAt` no `theme.json` do pacote ativo. Ajuste o manifesto do tema
e reinstale/ative o pacote para mudar o alvo da contagem.

## Validação

- Backend: `apps/server/tests/test_server_info.py` e login restrito em
  `apps/accounts/tests/test_auth_api.py`.
- Frontend: home default em `HomePage.test.tsx` e hero isolado em `PortalTheme.test.tsx`.
- Manual: ativar Coming Soon, abrir `/` em sessão anônima, confirmar a tela de lançamento; com
  restrição de staff, tentar login de jogador e de conta staff.
