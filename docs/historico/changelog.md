# Changelog

[← Índice da documentação](../README.md)

Todas as mudanças relevantes do PDL PRO serão registradas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não publicado]

### Adicionado

- CRUD de **calendário**, **FAQ**, **wiki**, **downloads** e **avisos** na central
  da staff (`/panel/admin/calendar`, `/panel/admin/faq`, `/panel/admin/wiki`,
  `/panel/admin/downloads`, `/panel/admin/notifications`): listar, criar, editar
  e excluir sem sair do painel. Avisos vão a um usuário ativo ou a todas as
  contas ativas, com entrega por Web Push.
- Extensões de cliente passam a **embarcar SQL Lineage** em
  `extensions/<cliente>/infrastructure/lineage/queries/`: overlay do dialeto do
  core (mesmo `-- name:` substitui) ou dialeto completo, sem patch em `apps/`.
  Hash de senha nova configurável (`LINEAGE_PASSWORD_ALGO`). A SPA descobre
  módulos pela pasta (`*/index.tsx`), i18n em `ext.<id>` e itens `nav` no site,
  painel e hub staff.
- Instaladores das versões publicadas para Linux (`packaging/install.sh`) e
  Windows (`packaging/install.ps1`): baixam o ZIP da GitHub Release, configuram
  o `.env` e sobem o Compose **puxando** imagens do GHCR, sem build no servidor.
- Workflow **Release publicada**: suíte, imagens `backend`/`web` no GHCR, ZIP
  `pdl-pro-X.Y.Z.zip` com checksum e anexos `install.sh` / `install.ps1`.
- `./setup.sh pack-release` e `scripts/pdl_release.py` para gerar o pacote
  localmente; Compose de produção interpola `PDL_BACKEND_IMAGE` e `PDL_WEB_IMAGE`.
- Guia [Distribuição](../operacao/distribuicao.md).
- Armazenamento privado (`PRIVATE_MEDIA_ROOT`, volume `private_files`) para o pacote de
  portabilidade LGPD: o arquivo sai apenas pela view com token assinado, tem nome com sufixo
  aleatório e não é publicado em `/media/`.
- Recusa de inicialização em produção quando a `SECRET_KEY` está vazia, contém marcador de
  exemplo (`django-insecure`, `change-me`) ou tem menos de 50 caracteres.
- Senha obrigatória no Redis de produção (`--requirepass`, `REDIS_URL` com credencial),
  gerada pelo configurador (`--rotate-redis-password`) e exigida pelo `deploy.sh`.
- Saneamento compartilhado de imagens enviadas (`common/images.py`): PNG/JPEG/WebP estáticos,
  até 2 MB e 1024 × 1024, reescritos como PNG sem metadados. Aplica-se a avatar, ícone de item
  customizado e imagem de apoiador.
- Ilustrações próprias para as conquistas do painel e do perfil, no mesmo desenho das
  atividades do Denkynho: 35 artes vetoriais cobrindo login, loja, leilão, carteira, baús,
  minigames, pescaria, Battle Pass, marketplace e progressão, resolvidas pelo código da
  conquista com reserva para códigos de extensões de cliente.

### Alterado

- Notícias, calendário e roadmap passam a editar e servir PT/EN/ES: a staff
  grava `*_en`/`*_es` em `/panel/admin/news`, `/panel/admin/calendar` e
  `/panel/admin/roadmap`; o site público pede `?lang=` (home, news, calendário
  e roadmap). Eventos do calendário ganham colunas de tradução no banco.
- A central de avisos deixa o menu e a rota `/panel/notifications`: o sino
  fica na barra superior do painel, com lista, leitura e push no painel
  flutuante. URLs antigas (`/panel/notifications`, `/painel/notifications`,
  `/notifications`) levam ao Painel.
- Atendimento sai do menu do painel. O jogador abre `/panel/support` só pela
  Ajuda (`Atendimento da equipe` ou chamado contextual). Chamados à espera do
  jogador passam a marcar o item Ajuda.
- A tela dedicada `/panel/progress` sai do produto: nível, XP, conquistas e
  prêmios de evolução da conta passam a viver no Painel (`/panel`). URLs
  antigas (`/panel/progress`, `/painel/progress`, `/progress`) redirecionam
  para o dashboard. Passe, bônus diário e 2FA permanecem em Jornada e
  recompensas e em Conta e segurança.
- A jornada de recompensas do painel passa a usar o mesmo chrome de Jogos,
  Progresso e Carteira: hero com arte do tema, selo de nível, calendário com
  carimbo do dia e pódio no ranking.
- O programa de apoiadores ganha o mesmo chrome: hero com arte, saldo de
  comissão em evidência, fichas de cadastro e estados vazios com ícone.
- `./setup.sh deploy --production` deixa de reconstruir imagens quando o `.env`
  aponta para uma imagem publicada; nesse caso o padrão é `--pull`.
- Pacote de release e clone sem `docker-compose.yml` de desenvolvimento passam
  a ser aceitos pelo `setup.sh` (árvore só com `docker-compose.prod.yml`).
- Senha de conta do jogo passa a exigir oito caracteres no cadastro e na troca (antes seis),
  na API e nos formulários do painel.
- Nginx de desenvolvimento e produção enviam CSP, `X-Frame-Options`, `Referrer-Policy` e
  `X-Content-Type-Options` em `/static/` e `/media/`, negam `/media/lgpd_exports/` e só
  aceitam `X-Forwarded-For` de proxies internos para a chave do rate limit.
- O segredo TOTP deixa de aparecer no admin do usuário; desmarcar a autenticação em dois
  fatores apaga o segredo e obriga novo cadastro.
- Conquista bloqueada passa a mostrar a própria arte como silhueta esmaecida com cadeado
  sobreposto, borda tracejada e rótulo de estado em destaque, no lugar do cadeado genérico.

### Corrigido

- No cantinho do Denkynho em telas estreitas, a dica do dia passa a ter a
  mesma largura e a mesma altura da faixa da pergunta.
- Webhook de pagamento com `order_id` de um pedido e `external_id` de outro passa a ser
  recusado e registrado em log, em vez de liquidar o pedido indicado nos metadados.

## [2.4.0] - 2026-09-13

Alterações desde **10 de setembro de 2026** (após `[2.3.0]`), consolidadas pelo histórico
Git até **13 de setembro de 2026**.

### Adicionado

- Palco de combate na **Arena das Feras**: golpes, barras e retrato da fera
  no palco; vitória ou derrota só depois da animação, sem toast.
- Confirmação de pagamento **mock só no admin** (`POST /api/v1/staff/payments/{id}/confirm-mock/`
  e botão em `/panel/admin/reports/financial/payments`), com aviso vermelho piscando
  de que o crédito não é um pagamento real. O jogador cria o pedido simulado e
  não consegue confirmar nem processar sozinho, mesmo com `PAYMENT_MOCK_AUTO_CONFIRM`.
- Self-service LGPD em `/panel/security`: exportação de dados por e-mail,
  exclusão/anonimização com OTP, preferências de cookies e enforcement real
  (analytics → Sentry; funcionais → persistência de idioma).
- Aviso explícito de **sessão expirada** (toast + lead no login) quando o refresh
  JWT falha de forma definitiva; logout manual não dispara a mensagem.
- Ficha do personagem (`/panel/accounts/...`): paperdoll no estilo do inventário
  L2 (slots, silhuetas SVG, modal de item), grade de **inventário** e **warehouse**
  (baú) com localização dos itens, e extras de ficha (Adena, karma, tempo online,
  último acesso, clã/ally com crest).
- **Leilão de personagem** em `/panel/auctions` (`kind: item | character`): criação
  com custódia na conta master, lances sem inventário de destino, fechamento
  automático no vencimento (transferência ao vencedor ou devolução ao vendedor),
  guards de offline/propriedade/listagem duplicada vs marketplace, e UI/i18n
  pt/en/es.
- Snapshot de **bag_items** e **skills** no leilão de personagem (inventário,
  warehouse e janela de skills no momento da publicação); o detalhe reutiliza
  paperdoll, bag/baú e skills da ficha.
- Arte original dos minigames no tema default (`images/games/*`) e palcos
  animados em `/panel/games` (roleta, baús por raridade, dados/slots, lago e
  arena), remapeáveis por `--theme-art-games-*`.
- Autoconfiguração dos minigames em `/panel/admin/games` (**Configurar todos**
  e o **configurador** por jogo): `POST /api/v1/staff/games/autoconfig/` cria
  um catálogo Interlude low rate com stacks (Adena, soulshots, poções,
  scrolls e encantamentos) e a tela permite editar parâmetros, prêmios,
  peixes, monstros e itens de baú pelo catálogo de itens.
- Pacote instalável de ícones de skills (`frontend/assets/skill-icons.tar.gz`):
  os PNGs entram em `frontend/public/skill-icons/` como `/skill-icons/<ID>.png`,
  fora do Git; `predev`/`prebuild` restauram o pacote. Ver
  [Ícones de itens e skills](../integracoes/icones.md).
- Lista de **skills do personagem** na ficha (`/panel/accounts/...`): janela no
  estilo do cliente L2 (abas Active/Passive e pastas Physical, Magic,
  Reinforcement, Weaken, Clan/Hero), com ícones, nível, encanto (+0…+N
  decodificado do `skill_level`) e nomes do XML; `GET
  /api/v1/customer/server/characters/<id>/skills/`.

### Alterado

- Na central de jogos, o saldo de fichas do hero atualiza na hora em
  que a jogada gasta ou credita fichas (roleta, baú, taverna, pesca e
  arena), sem precisar recarregar a página.
- A **Arena das Feras** divide o card em duas colunas: lista de feras,
  forja e palco só para o combate.   O encante atual fica no cabeçalho
  ao lado da trilha (+1 a +10).   Encantar abre um modal da tentativa
  e só então mostra vitória ou derrota (explosão dourada, cinzas na
  falha e celebração extra no +10), sem toast. A arma ganha sprite
  própria de +0 a +10 (luz de encante no estilo Lineage). A arena
  tem dez oponentes, cada um com retrato próprio. A forja
  mostra fragmentos e o botão. Lutar fica
  desativado (com relógio circular) enquanto a fera não pode combater,
  amarelo sem fichas, e Encantar fica verde com 10 fragmentos.
  No celular o palco sobe para a animação ficar visível.
- Na **Pescaria**, vara, lançar e troca de iscas ficam no mesmo painel;
  a moldura da isca em uso fica marcada, e trocar já deixa essa isca
  pronta para o lançamento. Nome, custo e dica só aparecem ao apontar
  o mouse.
- Na **Pescaria**, iscas e peixes passam a ter nome/descrição em pt, en e es
  (campos `*_en` / `*_es`, editáveis no admin). A API devolve o texto do idioma
  ativo; sem tradução, cai no português.
- Na **Pescaria**, o lançamento gasta 1 isca (comum ou encantada), não fichas.
  Fichas só compram isca comum (**1 ficha = 10**). As duas encantadas saem
  das comuns: aprendiz por 3 e encantada por 8.
- A **Pescaria** ganhou sprites em pixel art das espécies (lambari, dourado,
  piraíba e pirarucu), cardume com esteiras no lago, sequências de lançamento
  e fisgada, e o salto ou a fuga do peixe no palco e na coleção, com bolhas,
  splash, spray e o peixe no centro do lago, que some em seguida. O layout passou
  a um módulo único (lago + HUD, loja ao lado, coleção em grade), sem o vazio
  entre cards e sem timestamp ISO nos lances. O lago agora tem doze espécies,
  inclusive Koi Etéreo, Boiúna e Serafim de Eva (raridade divina). A coleção
  lista as espécies em duas colunas de raridade (comum/raro e
  épico/lendário/divino).
- Na **Roda da Fortuna**, o giro fica no centro vertical do card. O fundo da
  coluna anima com faixas e partículas; a roda deixa de ter o halo oval que
  vazava do círculo. A lista de prêmios usa a barra de rolagem do tema. O card
  do bônus diário ganhou o passo a passo e dicas.
- Prêmios dos minigames no estilo **Interlude low rate**: roleta, baús e
  pescaria entregam stacks (Adena 50k–5M, soulshots, poções, scrolls e
  encantamentos D–B); a arena no +10 rende 250k Adena. A lista em
  `/panel/games` mostra a quantidade; o autoconfig desativa o catálogo antigo
  de unidade isolada.
- Roda da Fortuna em `/panel/games`: tambor circular que mostra poucos itens
  por vez; o pedido vai à API na hora, o giro começa rápido e desacelera, e
  o palco só revela o prêmio (pop + fogos, sem toast) depois de 5s; a derrota
  pinta o círculo em vermelho, treme e marca o X.
- Baús Encantados em `/panel/games`: o título da aba tem um “?” que abre
  o passo a passo (mira, compra, abrir e resetar). Cada baú mostra o item
  em mira e o que mais pode sair; as aberturas deixam de se chamar
  boosters; a arte passa a
  ser pixel art da paleta do painel (sem foto de IA). A compra em reais
  sela o item em mira em um dos pacotes — quem abrir todos sempre leva; a
  sorte só decide se sai cedo ou no último. Abrir um pacote gasta 1 ficha:
  o baú do card treme e um modal no centro anima frames reais (fechado,
  entreaberto e aberto) por raridade, com fogos e o item, sem toast. O
  autoconfig separa o catálogo por raridade e inclui Ring of Baium no baú
  lendário. Os baús selados (ativos) usam um fundo mais marcado que os da
  loja, com o botão de abrir em verde; os CTAs ficam no rodapé do card,
  centralizados.   Quando o item em mira já saiu, uma faixa vermelha cruza
  a arte do baú. O autoconfig passa a selar 20–50 pacotes por
  baú (comum 20, raro 30, épico 40, lendário 50). O item em mira é
  sempre lendário e muda por baú (Blessed A / Armor S / Weapon S / Baium),
  com o resto do catálogo em stacks low rate. O reveal da mira troca o fundo
  do modal para um lavado dourado-violeta, com partículas e faixas em
  movimento, distinto do ouro dos outros pacotes. Resetar exige ter
  aberto um pacote e pede confirmação.
- Mesa da Taverna em `/panel/games`: cubo de dado 3D no feltro (seis
  faces, tombo até a face sorteada de frente, com brilho de escolha
  e volta ao repouso em alguns segundos), gabinete de caça-níquel
  com SVGs dos símbolos, giro fluido em sequência e, no resultado,
  modal de vidro limpo (mesa escurecida, lavado e anel) em ouro ou
  alerta, sem toast. Ícone com nome (Espada, Escudo, Coroa…) e, na
  colunas de jogo, as regras do dado (par/ímpar/alto/baixo · 2×) e
  do giro (10× / 2× / nada).
- Detalhe do marketplace (`/panel/marketplace`): paperdoll, bag/warehouse e
  skills no mesmo visual da ficha; o anúncio grava o snapshot na publicação
  para o comprador ver o personagem em custódia.
- Grades de inventário/warehouse e de skills na ficha: o mesmo quadrado
  (`48px`, ícone `32px`) nas duas janelas.
- `start-dev.bat` ficou seletivo: pip só em venv novo ou `requirements.txt`
  diferente, `npm install` só se o lock mudou, e não abre outra janela se
  API (`8000`) ou Vite (`3000`) já respondem. `PDL_FORCE_PIP=1` força o sync.
- Sem fichas nos jogos (`/panel/games`), a recusa abre um modal de vitrine
  (pacotes, total em reais e medalhão dourado) para comprar com o saldo da
  carteira, em vez de só o toast de saldo insuficiente.

### Corrigido

- No reveal dos **Baús Encantados**, o item volta a ficar centralizado sob o
  baú: o pop da roleta (`translate(-50%, -50%)`) não se aplica mais ao prêmio
  do modal, que já está no fluxo.
- Paperdoll da ficha (`Itens equipados`) voltou a ficar centralizado na coluna.
- Chrome visual das áreas legais e cookies alinhado ao tema público (ouro/marrom,
  `public-pages.css` + `terms.css` remapeável no público e no painel), no lugar
  do CSS genérico empacotado no Vite.

## [2.3.0] - 2026-09-10

Alterações desde **9 de setembro de 2026** (após `[2.2.0]`), consolidadas pelo histórico
Git até **10 de setembro de 2026**.

### Adicionado

- Pacote legal completo (Termos, Privacidade, Acordo, Cookies, LGPD) em pt/en/es,
  histórico público `/legal/history`, banner de cookies versionado e reaceitação
  obrigatória no painel quando `LEGAL_DOCS_VERSION` muda; identidade do
  controlador configurável por env. Ver
  [Documentos legais e LGPD](../funcionalidades/documentos-legais-e-lgpd.md).
- Atalhos **API** e **Painel** no header do Django Admin/Jazzmin (ao lado de
  Componentes), espelhando a topbar da documentação OpenAPI.
- Card **API** no hub `/panel/admin` (módulo Sistema), com link externo para
  `/api/docs/swagger-ui/` e textos pt/en/es.
- Área e guia de **extensões de cliente** (`backend/extensions/`,
  `frontend/src/extensions/` com catálogo + `VITE_PDL_EXTENSIONS` e montagem
  em `AppRoutes`, `PDL_EXTENSION_APPS`, `extensions.surface` e skeletons
  `_example`) para overlay sem patchar o core; ver
  [Extensões de cliente](../arquitetura/extensoes.md).
- Django **gettext** no backend: `LANGUAGES` pt-br/en/es, `LocaleMiddleware`,
  `ApiLanguageMiddleware`, catálogos em `backend/locale/`, `POST /i18n/setlang/`
  e tradução das mensagens base de `DomainError` na borda HTTP; a SPA envia
  `X-Language` e `Accept-Language`.
- Cobertura gettext ampla do admin/Jazzmin: `verbose_name` / choices / help_text
  dos modelos, `AppConfig`, fieldsets, formulários, e-mails de conta/vinculação,
  `welcome_sign` do Jazzmin e catálogo de msgids de domínio (~300 strings EN/ES).
- Mensagens de **API** (auth, validators, serializers, staff e envelope de erro)
  com gettext; o exception handler também traduz `message`/`details` no idioma ativo.
- Correção dos catálogos EN/ES: remoção de restos *fuzzy* (`#|`) que mapeavam
  msgids parecidos para `msgstr` errados (ex.: refresh ausente, ID de item, 2FA).
- Internacionalização **pt/en/es** das telas admin da SPA (`admin.json`: chrome,
  finanças, server, themes, commerce, custom items, item watch, game content,
  roadmap, supporters e demais módulos).
- Summaries/descriptions OpenAPI e tags do Spectacular com `gettext_lazy`,
  catálogos EN/ES preenchidos.
- Fechamento das lacunas de chrome i18n: Pesca (`FishingGame`), labels de
  `ProgramUI`, fallbacks HTTP/OAuth/pagamentos/`ItemIdField`, templates Jazzmin
  (`base.html` / `pdl_components.html`) e formatadores sem `pt-BR` fixo nas telas
  do painel.

### Alterado

- Dependências Python: `bleach` 6.4.0 (XSS/URI), `djangorestframework` 3.18.1,
  `mercadopago` 3.6.0, `psycopg2-binary` 2.9.13, `sentry-sdk` 2.69.1; `pip-audit`
  limpo. Django permanece em 6.0.8 (`django-celery-beat` <6.1).
- Tema builtin renomeado para **PDL Classic**, com descrição voltada à identidade
  visual (Aden, tipografia e look original), em vez de “PDL Default / tema preservado”.

### Corrigido

- Edge Nginx (dev e produção) passa a encaminhar `/i18n/` ao Django; sem isso o
  `POST /i18n/setlang/` do seletor de idioma caía no estático da SPA e respondia
  **405 Not Allowed**.
- Idioma da SPA e da API sincronizados: o cliente envia `X-Language` e, nas
  rotas `/api/`, `Accept-Language` prevalece sobre o cookie `django_language`
  (antes o setlang do Jazzmin travava o gettext da API no idioma do admin).
- Seletor de idioma no **admin** (Jazzmin + login) e na documentação **Swagger/ReDoc**,
  com sync bidirecional cookie `django_language` ↔ `localStorage` `pdl.language`.
- Migrações pendentes de `Meta.verbose_name` (gettext) em `games`, `programs`,
  `server` e `shop` — `makemigrations --check` volta a passar.
- Tela **Coming Soon** / abertura do servidor passa a usar i18n pt/en/es (kicker,
  subtítulo de abertura, contagem e CTAs), em vez de textos fixos em português, e
  inclui seletor de idioma (a página substitui o layout público sem nav/footer).
- **Landing** (`HomePage` default): copy da UI em pt/en/es; o hero do tema builtin
  usa o marketing traduzível (não o nome/descrição técnicos do pacote).
- Páginas públicas **Info**, **Rankings**, **Wiki**, **News**, **Roadmap** e
  **Legal** (acordo/termos/privacidade) com chrome i18n pt/en/es; wiki/news/legal
  pedem `?lang=` conforme o idioma ativo.
- Cobertura i18n restante do público: **Downloads**, **Calendário**, **FAQ**
  (`public.json`), fluxo de **auth** (`auth.json`), chrome do tema **portal-v1**
  e mensagem do **ResourceGate**.

## [2.2.0] - 2026-09-09

Alterações desde **2 de setembro de 2026** (após `[2.1.0]`), consolidadas pelo histórico
Git até **9 de setembro de 2026**.

### Adicionado

- Área unificada de **Relatórios** na staff (`/panel/admin/reports`) com categorias
  Financeiro, Inventário, Leilões, Compras da loja e Marketplace; APIs em
  `/api/v1/staff/operational-reports/`.
- Internacionalização **pt / en / es** na SPA (`i18next`), seletor de idioma persistente,
  campos `*_es` (e EN onde faltava) em FAQ, notícias, wiki, roadmap e documentos legais;
  assistente e FAQ aceitam `lang=es`.
- Cobertura pt/en/es das telas de engajamento do painel (Jogos, Jornada e recompensas,
  Progresso, Apoiadores e Ficha do personagem) e da área administrativa (central de
  módulos, relatórios operacionais e financeiros, fila de chamados), com novos blocos
  `games`, `rewards`, `progress`, `supporters` e `character` em `panel` e `support`,
  `statusLabels` e `finance` em `admin`.
- Observabilidade: logging estruturado, auditoria, integração Sentry e middleware de
  rastreamento de requisições e erros.
- Central de **Help** com FAQ (categorias, busca, audiência, suporte EN), artigos só
  para o assistente e tipagens diárias contextuais com múltiplas dicas por tópico.
- Companheiro **Denkynho**: personalidade local, preferências (nome preferido, detalhe
  da resposta), handbook administrativo, emoções/empatia, moderação, protocolos de
  segurança (crise, assédio, injeção de prompt) e respostas sociais.
- Integração de modelo de IA local e remoto para o assistente (Docker, variáveis de
  ambiente, fallback e validação de endpoint).
- Cuidados e vida do mascote: ações (carinho, banho, caminhada, dança etc.), rotina
  ambiente, poses/overlays PNG, cenas de guarda-roupa (jardim, biblioteca, acampamento,
  lago) e ícones de atividade.
- Página **Coming Soon** com título/subtítulo/data de lançamento, countdown, efeitos
  visuais, restrição de login para não-staff e coexistência da landing em `/home`.
- Gestão de sessões ativas: listar, revogar uma sessão e revogar as demais.
- Conclusão de credenciais para usuários OAuth (`CompleteCredentialsUseCase`).
- Promoções de compra de moedas (`CoinPurchasePromo`) no catálogo de pagamento e
  gestão/exibição na carteira.
- Validação de contas de jogo, limpeza de contas órfãs e reforço no acesso a
  personagens.
- Paginação de pedidos de pagamento e transações da carteira, com `created_at` /
  `paid_at` nas respostas.
- Configuração de layout de temas (ordem e visibilidade de seções) e exibição do
  contrato de compatibilidade na instalação de temas.
- Configuração administrativa de MFA; rate limits dedicados de login/cadastro;
  request key em operações de serviço de personagem.
- Componente `Select` temático compartilhado nos formulários; emblema `PDLSymbol` e
  arte original na home (trailer, seções visuais).
- Sanitização HTML em descrições de roadmap e notícias.
- Migração documentada de **Clean Architecture + DI** no backend e de **camadas SPA**
  no frontend (PDFs e guias em `docs/arquitetura/`); regras espelhadas em `AGENTS.md`.
- Cobertura de temas no caminho público/painel: `data-theme-surface` consistente,
  Coming Soon no chrome do tema, CSS de features em tokens `--theme-*` / `--panel-*`.

### Alterado

- Backend alinhado a portas, casos de uso e `AppProvider`: conquistas, progresso,
  OAuth, WebAuthn, e-mail, recompensas de jogos e sessão de autenticação
  (`IAuthSessionService.require_user`; cookies JWT montados na presentation).
- Frontend: barrel `services/api.ts`, serviços por capacidade (`gamesApi`,
  `programsApi`, `staffGameContentApi`, `catalogApi`), páginas finas e invalidação
  TanStack escopada; Help enxuto via controller de feature.
- Exceções de domínio mais específicas em ações de jogo e concessão de recompensas;
  repositórios no lugar de acessos ORM espalhados nos fluxos de conta/perfil.
- Tokens de acesso/refresh removidos do corpo das respostas de autenticação
  (sessão por cookies).
- Limite de mensagem do chat do assistente elevado para 400 caracteres.
- Datas e números do painel e dos relatórios seguem o idioma ativo: os formatadores
  fixos em `pt-BR` deram lugar a `formatDate`, `formatDateTime` e `formatNumber` em
  `frontend/src/lib/formatters.ts`.
- Textos sociais do Denkynho (boas-vindas, intenções e “como estou”) passaram a
  `personality.json` (pt/en/es); matchers e poses permanecem no código.
- Estilos do painel admin e da Help refinados para hierarquia e responsividade com
  tokens de tema.
- Arquivos `.log` passam a residir apenas em `backend/log/` e `frontend/log/`
  (handler rotativo no Django de desenvolvimento; Vite espelha warn/error e proxy).
- URLs da SPA padronizadas em inglês (`/panel`, `/info`, `/home`, `/panel/help`,
  `/panel/admin/reports/...`); paths em português redirecionam para os equivalentes.
  Catálogo de telas do Denkynho, links de notificação de suporte e handbook alinhados.

### Corrigido

- O `requirements.txt` do backend passa a instalar PyTorch CPU. O wheel padrão do
  PyPI no Linux puxava CUDA 13 e esgotava o disco no `docker compose` de produção.
- Bloqueio de respostas em chamados fechados ou resolvidos, com mensagem clara.
- Layout, assets e responsividade da página Coming Soon (incluindo mobile).
- Caminhos e âncoras de assets/poses do Denkynho; pin de estrela e overlays ambiente.
- Documentação local de desenvolvimento (proxy com backend indisponível) e caminhos
  de teste no Vitest.
- Ícones Jazzmin dos models de programas e descrição OpenAPI da tag
  `Staff / Relatórios`.

## [2.1.0] - 2026-09-02

### Adicionado

- Sistema global de temas instaláveis por ZIP, com API pública do tema ativo e
  administração restrita a superusuários para instalar, ativar, restaurar e remover
  pacotes.
- Renderer declarativo `portal-v1`, com identidade visual aplicada à home, páginas
  públicas internas, autenticação, painel do jogador e administração React.
- Tema Valorem de referência, baseado no projeto `PDL/SITE`, com composição portada
  para React, menu móvel, countdown, cards de sistemas, rankings interativos, CTA,
  notícias, shells privados e assets próprios.
- Contrato estável de superfícies e componentes temáticos por meio de
  `data-theme-surface` e `data-theme-part`, abrangendo botões, cards, campos, abas,
  cabeçalhos e estados de consulta.
- Criação automática de `MEDIA_ROOT/themes` pelo deploy e pelo instalador, permitindo
  o primeiro uso com volume de mídia vazio.
- Gestão de contas pela equipe, com listagem e inspeção de usuários, visualização das
  contas e personagens vinculados, alteração de papéis e desvinculação controlada.
- Consulta detalhada de personagens e preços dos serviços de conta e personagem no
  painel do jogador.
- Autenticação por OAuth, proteção hCaptcha no cadastro e suporte a avatar no perfil.
- Inventário por conta e personagem, visualização de equipamentos, seleção de itens,
  regras de negociabilidade e gerenciamento de bolsas usado pelo inventário, jogos e
  checkout.
- Pacotes de carrinho, códigos promocionais e integração das compras com conquistas e
  recompensas de progresso.
- Datas de criação e atualização nos leilões, com informações adicionais na experiência
  de lances e listagem.
- Central de suporte para jogadores e staff, com abertura, resposta, atribuição e
  acompanhamento de chamados.
- Evolução do passe de batalha com missões, trocas e resgate automático de recompensas;
  melhorias no bônus diário, batalhas, pesca e conteúdo dos jogos.
- Observação da economia de itens na central da staff, com categorias, snapshots,
  favoritos, comparação e enriquecimento pelos metadados XML do Lineage.
- API pública de metadados de itens, catálogo customizado administrável e resolução
  compartilhada de nomes, ícones, tipos e regras de troca.
- Pacote de ícones de itens incorporado ao artefato de produção e scripts para importar,
  empacotar e reconstruir o catálogo do frontend.
- Scripts operacionais de instalação, configuração, deploy, backup e restauração,
  incluindo rotação de segredos e detecção do ambiente de produção.
- Stack de produção com Compose, Nginx, frontend estático, health checks e suporte a
  implantação atrás de proxy reverso externo.
- Biblioteca React de botões, campos, cards, cabeçalhos, abas, paginação e estados de
  consulta, com catálogo interativo para desenvolvimento.
- Base visual compartilhada no Django/Jazzmin, página de componentes administrativos e
  assets comuns para botões e ações nativas.
- Testes de autorização, identidade, pagamentos, carteira, inventário, comércio,
  infraestrutura e atendimento no backend; contratos HTTP, sessão, rotas e
  interações de telas no frontend. [Resultados e limites](2026-09-02-testes.md).
- Cobertura com pisos verificados, Testing Library/jsdom, checagem de tipos dos
  testes e workflow de qualidade para backend e frontend.
- Política obrigatória de testes para novas features e correções em `AGENTS.md`
  e no guia de desenvolvimento.
- Guias de testes, frontend, pagamentos, backup/restauração e diagnóstico, com
  documentação organizada por assunto em `docs/` e índice central.
- Relatórios financeiros na central administrativa: saldos, fluxo de caixa diário,
  pedidos e pagamentos, e reconciliação de carteiras, com filtros, totais, paginação
  e gráfico de movimentações. APIs restritas à equipe; bônus incluídos na reconciliação
  e totais de pagamentos separados por BRL/USD.
- Documentação de desenvolvimento, configuração, API e implantação.
- Guias de contribuição e segurança.

### Removido

- Rede social: feed, curtidas, comentários, amizades e chat entre jogadores.
- Módulo de clãs, incluindo perfis, endpoints e telas que ainda dependiam da
  implementação social removida.

### Corrigido

- Resolução dos assets declarados pelo tema instalado, precedência da folha de estilo
  do pacote e conflito entre a navegação global e o chrome do renderer Valorem.
- Responsividade das ações e formulários do shell de autenticação Valorem.
- Sessão por cookies, renovação de autenticação e preservação do estado do usuário
  entre carregamentos e respostas expiradas.
- Autorização de personagem na consulta de inventário e sinal de saídas no extrato.
- Limpeza da seleção ao trocar de conta no inventário e bloqueio de publicação
  duplicada de personagem no marketplace enquanto a requisição está pendente.
- Tratamento de falhas observáveis no marketplace e nos fluxos de conta, perfil,
  carteira, loja, inventário, jogos e suporte.
- Cotação por código de pacote, validação de identificador OAuth, desafios 2FA
  malformados e autenticação de contas desativadas entre as etapas.
- Conversão de transports e tratamento de falhas de verificação de passkeys.
- Consultas SQL do dialeto Dream v3 alinhadas ao schema real do Lineage.
- Caminho do SQLite resolvido corretamente nas configurações locais.
- Preservação do prefixo `/api` e normalização de caminhos ao operar atrás de proxy
  reverso, incluindo a seleção correta do Compose de produção.
- Disponibilidade dos ícones de itens depois do build e do deploy de produção.

### Alterado

- O tema `default` passou a funcionar como fallback interno, imutável e restaurável;
  pacotes e mídias de temas permanecem fora do Git e são persistidos no volume de
  mídia da instalação.
- HTML e comportamentos JavaScript específicos de temas passaram a ser executados por
  componentes React homologados. O ZIP aceita CSS, manifesto e assets locais, mas
  bloqueia HTML/JavaScript arbitrário e referências externas.
- A observação de itens deixou as telas isoladas do Django Admin e passou a integrar a
  central React da staff, preservando ferramentas administrativas especializadas.
- A exibição de personagens, equipamentos e itens negociáveis passou a compartilhar as
  mesmas regras e metadados do catálogo Lineage.
- O painel privado recebeu menu lateral recolhível, navegação reorganizada e comportamento
  responsivo para desktop e celular.
- Formulários de usuários no Django Admin passaram a usar seletores de grupos e permissões
  com busca e transferência; ícones do Jazzmin foram centralizados e os models adotaram a
  base administrativa compartilhada.
- README principal focado na apresentação do produto e nos caminhos de leitura;
  explicações detalhadas e guias centralizados nas pastas de `docs/`.
- Documento de arquitetura ampliado com dependências, DI e fluxo de implementação.
- Classes públicas, serializers, formulários e casos de uso receberam docstrings sobre
  responsabilidade, entrada, retorno e efeitos relevantes.
- Swagger UI e ReDoc com o tema ouro/escuro do frontend e do Jazzmin.
- Licenciamento alterado para termos source-available, permitindo estudo, modificação
  para uso próprio e redistribuição gratuita, sem autorizar comercialização por terceiros.

## [2.0.0] - 2026-08-31

### Adicionado

- Monorepo com backend Django/DRF e frontend React/Vite.
- Autenticação por cookies JWT, perfil, 2FA, progresso e recompensas.
- Integração configurável com bancos Lineage 2 nos módulos Lucera v2 e Dream v3.
- Carteira, loja, pagamentos, inventário, marketplace e leilões.
- Conteúdo, clãs, feed social, amizades, chat e notificações.
- Jogos, bônus diário, caixas, economia e passe de batalha.
- Docker Compose com PostgreSQL, Redis, Gunicorn, Daphne, Celery, Nginx e frontend de desenvolvimento.
