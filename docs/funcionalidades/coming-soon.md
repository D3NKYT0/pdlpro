# Coming Soon

[Índice](../README.md) · [Temas](temas.md) · [Painel e servidor](../desenvolvimento/interface-admin.md)

O Coming Soon exibe uma **página de lançamento própria** em `/`, sem o chrome público
(nav/rodapé padrão ou portal). A **landing** (`HomePage`) continua acessível em `/home`
enquanto o modo estiver ativo — as duas rotas coexistem. A equipe configura o modo em
**Painel > Administração > Coming Soon**. Identidade, rates e SEO ficam em
**Painel > Administração > Painel e servidor**.

## Configuração

| Campo | Uso |
| --- | --- |
| Nome, slogan, descrição | Identidade no hero (o slogan aparece abaixo do título) |
| Crônica, nível máximo, rates, encantamento | Faixa de dados na página de lançamento |
| Ativar Coming Soon | Liga a página de lançamento em `/` |
| Permitir rolagem com Informações | Com a contagem ativa, libera o scroll e exibe as seções públicas de Informações (Visão geral, Rates, Encantamento, Recursos, PvP e Como começar) |
| Mostrar personagens laterais | Liga ou desliga os campeões à esquerda e à direita da página de lançamento |
| WhatsApp / Facebook / Instagram / YouTube / Discord | URLs HTTPS opcionais; só as preenchidas aparecem lado a lado abaixo do contador (e acima do “Role para ver…”, quando ativo) |
| Título | Headline opcional; se genérico (“Em breve”), usa o nome do servidor |
| Subtítulo | Texto de apoio opcional; se vazio, usa slogan ou descrição |
| Data e hora do lançamento | Alvo da contagem regressiva (obrigatória com o modo ativo) |
| Login apenas para staff | Bloqueia o login de jogadores comuns |
| Permitir criar conta no site | Liga ou desliga o cadastro público (e-mail e OAuth) |
| Permitir criar conta L2 | Liga ou desliga a criação de contas do jogo no painel (staff continua liberada) |

A ativação sem data de lançamento é rejeitada pela API.

## Comportamento público

1. Visitantes em `/` veem a tela full-bleed com contagem regressiva.
2. A landing permanece em `/home` (com chrome público). Sem Coming Soon, `/home`
   redireciona para `/`.
   Com o modo ativo, os atalhos de Início do chrome (menu, marca, rodapé, tema
   `portal-v1` e “voltar ao site” do painel) apontam para `/home` quando há sessão,
   para que quem já entrou não volte à contagem regressiva. Visitante anônimo e site
   aberto continuam indo para `/`.
3. O kicker fixo é “Em breve”; o hero usa o título de lançamento ou o nome do servidor,
   o slogan do painel e a descrição (ou o subtítulo de lançamento, se houver).
4. A coluna da esquerda lista crônica, nível máximo, rates e encantamento; a da
   direita mantém o hero original (título, slogan, subtítulo, contagem e botões).
   Em telas estreitas as colunas empilham, com o hero primeiro.
   Se **Permitir rolagem com Informações** estiver ativo, o dossier compacto some,
   a página passa a rolar e as seções completas de `/info` aparecem abaixo do hero
   (enquanto a contagem ainda estiver em andamento).
5. Enquanto a contagem está ativa, quatro personagens em pose de batalha
   (`images/coming-soon/*.png`) flanqueiam os painéis, olhando para o visitante,
   desde que **Mostrar personagens laterais** esteja ligado (padrão: ligado).
   As artes compartilham a mesma escala em pé (recorte sem folga no quadro).
   Uma névoa no rodapé envolve os pés da party e some no vídeo de entrada.
   Na abertura entram as poses de assalto; some em telas estreitas.
6. Abaixo do painel do contador, só as redes com URL preenchida no painel
   (WhatsApp, Facebook, Instagram, YouTube, Discord) aparecem lado a lado. Com
   Informações ativas, ficam acima do “Role para ver as informações”.
7. Entrar é a ação principal: o clique some a interface, troca o fundo estático pelo vídeo
   (`videos/coming-soon/video.mp4`, sem áudio) e, ao terminar (ou se a reprodução falhar), abre o login.
   Pular ou Esc interrompem a cena. Com `prefers-reduced-motion`, o vídeo é ignorado.
   Ctrl+clique (e equivalentes) no Entrar segue direto ao login. Downloads fica secundário.
8. Login e Downloads permanecem acessíveis pelos botões da página.
9. Outras rotas públicas (notícias, wiki, etc.) continuam com o layout normal.
10. Controles de acesso no Coming Soon (independentes entre si):
   - cadastro fechado → `COMING_SOON_REGISTRATION_RESTRICTED` em registro e OAuth de novas contas;
   - login só staff → `COMING_SOON_LOGIN_RESTRICTED` para jogadores comuns (senha/passkey/OAuth/2FA);
   - criação L2 fechada → `COMING_SOON_L2_REGISTRATION_RESTRICTED` para jogadores (staff continua autorizada).
11. Quem já está autenticado em `/login` é enviado à landing (`/home`), salvo `?next=`
   local válido. Conta social sem senha utilizável vai para `/complete-account`.

No admin, com Coming Soon ativo, use **Ver página de lançamento** para abrir `/` em nova aba.

Quando a data chega, a contagem some e a página entra no estado de abertura: troca o fundo
para o assalto ao castelo (`bg/coming-soon-open.png`), a party avança pelo portão
(`images/coming-soon/assault-*.png`; a vanguard fica na frente da raider à esquerda),
kicker “A guerra começou”, mensagem “O assalto começou”
e ênfase no botão Entrar. Sem fogos nem casal comemorativo.
O Coming Soon continua ativo até a equipe desligar o modo no painel.

Enquanto a contagem está ativa, o fundo usa o **mesmo castelo do hero da landing**
(`hero-bg.jpg` nos temas club; `bg/1.png` no Classic), não a arte de personagem de
`coming-soon.png`.

Contrato público em `GET /api/v1/public/server/info/`:

- `name`, `slogan`, `description`, `chronicle`, `rates`, `enchant`, `max_level`
- `seo_title`, `seo_description`, `og_title`, `og_description`, `og_image`
- `discord_url`, `whatsapp_url`, `facebook_url`, `instagram_url`, `youtube_url`, `trailer_youtube_id`
- `coming_soon`
- `coming_soon_show_info`
- `coming_soon_show_champions`
- `coming_soon_title`
- `coming_soon_subtitle`
- `coming_soon_at` (ISO 8601 ou `null`)
- `staff_only_login`
- `allow_registration`
- `allow_l2_registration`

Persistência em `IndexConfig` via `PUT /api/v1/staff/panel/`.

O countdown do hero nos temas `portal-v1` é independente: a página Coming Soon não reutiliza o
hero do tema.

## Validação

- Backend: `apps/server/tests/test_server_info.py`, `apps/staff/tests/test_staff_config_api.py`,
  login restrito em `apps/accounts/tests/test_auth_api.py`.
- Frontend: `ComingSoonPage.test.tsx`, `PublicLayout.test.tsx`, `LoginPage.test.tsx`, chrome em
  `SiteNav.test.tsx`, `SiteFooter.test.tsx`, `PrivateLayout.test.tsx`, `PortalTheme.test.tsx`,
  admin em `AdminSettings.test.tsx` (Coming Soon e Painel/servidor separados), `AdminHubPage.test.tsx`.
-   Manual: abrir **Coming Soon** no hub (`/panel/admin/coming-soon`), definir título/data, ativar,
  abrir `/` anônimo e conferir a contagem; em **Painel e servidor** alterar nome/rates sem misturar
  controles de lançamento; autenticado, clicar em Início no menu e conferir que
  permanece em `/home`; tentar login de jogador com restrição de staff;
  visitar `/login` já autenticado e confirmar o redirect para `/home`;
  clicar em Entrar na página de lançamento, conferir que a UI some e o vídeo ocupa o fundo,
  e que o fim da cena (ou Pular) abre `/login`.
