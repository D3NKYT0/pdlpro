# Temas instaláveis

[Índice](../README.md) · [Componentes](../desenvolvimento/componentes.md) · [Implantação](../operacao/implantacao.md)

O PDL PRO aplica uma única identidade visual às páginas públicas, autenticação, painel do
jogador e administração React. Além de CSS e assets locais, um pacote pode selecionar um
renderer homologado e declarar sua composição, conteúdo e comportamentos no `theme.json`.

O tema `default` é interno, imutável e permanece em `frontend/public/theme/default`. Ele não é
gravado na tabela de pacotes, não pode ser enviado, removido ou sobrescrito e volta a ser usado
quando nenhum tema instalado está ativo. Assets omitidos por um pacote também usam o arquivo
correspondente do default.

## Instalar e ativar

Somente um superadministrador pode alterar a aparência global:

1. Abra **Painel > Administração > Temas**.
2. Na coluna de instalação, selecione um ZIP PDL 2.0 de até 32 MB. A coluna ao lado resume o
   contrato dos temas compatíveis.
3. Instale o pacote. A instalação não o ativa automaticamente.
4. Confira nome, autor e versão e pressione **Ativar**.

Para reverter, ative **PDL Classic**. Um pacote ativo não pode ser removido; primeiro ative o
default ou outra versão. A ativação é transacional e nunca deixa dois temas ativos.

O pacote Valorem de referência pode ser gerado e mantido localmente em
`frontend/theme-packages/valorem-pdl2.zip`. Essa pasta é ignorada pelo Git: pacotes, fontes e
assets comerciais são distribuídos fora do repositório e instalados pelo painel.

O pacote de referência atual usa o identificador `valorem`, a versão `2.1.3` e o renderer
`portal-v1`. Seu conteúdo de autoria pode permanecer em `frontend/theme-packages/valorem/`,
também fora do Git. Para gerar o instalador no PowerShell, execute na raiz do repositório:

```powershell
Compress-Archive `
  -Path frontend/theme-packages/valorem/theme.json,frontend/theme-packages/valorem/theme.css,frontend/theme-packages/valorem/images `
  -DestinationPath frontend/theme-packages/valorem-pdl2.zip `
  -CompressionLevel Optimal -Force
```

Inclua no ZIP somente os arquivos aceitos pelo contrato. Um README de autoria pode ficar ao lado
do manifesto na pasta local, mas não deve ser empacotado porque arquivos Markdown não fazem
parte do formato instalável.

## Contrato do pacote

O ZIP contém seus arquivos diretamente na raiz:

```text
theme.json
theme.css
images/
  logo.png
  background.webp
fonts/
  display.woff2
```

Manifesto mínimo:

```json
{
  "schemaVersion": 1,
  "pdlVersion": 2,
  "id": "meu-tema",
  "name": "Meu Tema",
  "version": "1.0.0",
  "author": "Equipe",
  "description": "Identidade visual do servidor.",
  "entrypoint": "theme.css",
  "assets": {
    "images/logo.png": "images/logo.png",
    "images/bg/5.jpg": "images/background.webp"
  }
}
```

`assets` mapeia o nome lógico usado pelo frontend para um arquivo do pacote. O caminho deve ser
relativo e existir no ZIP. Não declare um asset para manter a versão do default. O emblema do
chrome (`PdlSymbol`, nav, rodapé, splash de boot, overlay de rota e auth) lê
`images/pdl-symbol.svg`; um PNG no pacote pode ocupar esse slot
(`images/pdl-symbol.png`). O splash HTML (`#app-bootstrap-loader`) também lê
`--theme-accent`, `--theme-accent-bright` e `--theme-bg-deep`: depois da primeira
visita o chrome fica em `localStorage` (`pdl.loaderChrome`) e o script estático
reabre o loader já com o brasão e o acento do pacote ativo. O splash e o
overlay de rota compartilham o layout clássico com losango: emblema,
wordmark `logo.png`, texto e barra. O contrato público
relê só o mapa de `assets` do `theme.json` em `media/themes/<pacote>/`.
`presentation` e `layout` continuam os gravados na instalação, para um ajuste
de arte no media não trocar o template da home.

Quando `presentation` for usado, ele deve declarar integralmente o contrato do renderer. Os
blocos aceitos pelo `portal-v1` são:

| Bloco | Responsabilidade |
| --- | --- |
| `navigation` | De 1 a 12 links internos do cabeçalho |
| `home.hero` | Título, descrição, countdown ISO 8601 e CTA |
| `home.features` | De 1 a 12 recursos com assets declarados |
| `home.ranking` | Abas de ranking ligadas aos dados reais do PDL |
| `home.cta` e `home.news` | Conversão e listagem de notícias |
| `home.sections` | Opcional: ordem e visibilidade (`hero`, `features`, `ranking`, `cta`, `news`) |
| `footer` | Tagline e copyright |
| `shells.auth`, `shells.panel`, `shells.admin` | Marca e contexto das telas internas |

Rotas devem ser internas e iniciar com `/`. Propriedades desconhecidas são rejeitadas, de modo
que erros de digitação não sejam silenciosamente ignorados.

## Layout estrutural

O bloco opcional top-level `layout` declara knobs validados que o `ThemeProvider` injeta como
CSS variables no `html`. Pacotes sem `layout` preservam os defaults atuais.

| Campo | Faixa / valores | CSS variável |
| --- | --- | --- |
| `panel.sidebarWidth` | 200–360 (px) | `--panel-sidebar-width` |
| `panel.density` | `compact` \| `comfortable` \| `spacious` | escala de gap/padding (`--panel-shell-*`) |
| `panel.radius` | 0–24 (px) | `--panel-radius` |
| `public.headerHeight` | 48–160 (px) | `--public-header-height` |
| `public.containerWidth` | 720–1600 (px) | `--public-container-width` |
| `surfaces.buttonPrimary` | caminho lógico em `assets` | `--theme-button-primary` |
| `surfaces.buttonSecondary` | caminho lógico em `assets` | `--theme-button-secondary` |
| `surfaces.buttonTab` | caminho lógico em `assets` | `--theme-button-tab` (Download do header; fallback `images/button/3.png`) |

Exemplo:

```json
{
  "layout": {
    "panel": { "sidebarWidth": 288, "density": "compact", "radius": 6 },
    "public": { "headerHeight": 72, "containerWidth": 1200 },
    "surfaces": {
      "buttonPrimary": "images/button/1.png",
      "buttonSecondary": "images/button/2.png",
      "buttonTab": "images/button/3.png"
    }
  }
}
```

O CSS estrutural do painel (`panel.css`) e botões públicos usam essas variáveis. Assets de arte
de seção (`images/bg/1.png` e `images/bg/2.jpg` … `bg/5.jpg`) também entram como `--theme-art-bg-*` a partir do mapa
`assets`, mesmo sem `layout`. A central de jogos usa pixel art nos baús do default
(`images/games/box-{common,rare,epic,legendary}{,-ajar,-open}.webp`, tokens `--theme-art-games-box-*`).
O Cruma troca esses arquivos por baús pintados (ciano-esmeralda) no
próprio pacote e desliga o `image-rendering: pixelated` da arte.
A central também usa `images/games/fishing-pond.webp`,
`images/games/fish-{lambari,tilapia,traira,dourado,tucunare,tambaqui,piraiba,surubim,pirarucu,koi,boiuna,serafim}.webp` e
`images/games/monster-default.webp`, os retratos
`images/games/monster-{keltir,wolf,goblin,orc,lizardman,ant,werewolf,ogre,drake,death-knight,queen-ant}.webp`
e os ícones realistas
`images/games/sword-{0-10}.webp` e `images/games/rod-{1-10}.webp` como `--theme-art-games-*`.
A Arena das Feras usa a espada do encante atual (luz de Lineage
que cresce do aço ao glow santo) e aceita textura opcional em
`--theme-art-games-arena`. A pescaria usa a vara do nível atual
(junco no 1 até a divina no 10; nível 11+ reusa a arte 10).
A Mesa da Taverna aceita textura opcional em
`--theme-art-games-chance-felt` e `--theme-art-games-chance-cabinet` (o default
desenha feltro e gabinete só com tokens). A loja do painel usa
`images/shop/hall.png`, `images/shop/crate.png` e `images/shop/coins.png`
(`--theme-art-shop-hall`, `--theme-art-shop-crate`, `--theme-art-shop-coins`)
no hall, nos pacotes e no carrinho. O script `frontend/scripts/paint-box-chests.py` regenera os baús
pixelados do default. `frontend/scripts/prepare-cruma-box-chests.py`
recorta o chroma magenta e grava os 12 WebP do Cruma. `frontend/scripts/paint-fishing-rods.py` confere as dez varas.
Variantes de chrome do painel (`topnav`) ficam para um bump futuro
do renderer; nesta versão o shell permanece sidebar.

## Estrutura e comportamento

O campo opcional `presentation` seleciona um renderer confiável do PDL. O renderer `portal-v1`
entrega cabeçalho e rodapé próprios, menu móvel, hero com countdown, cards de recursos, rankings
com abas e dados reais, CTA e notícias. Ele também tematiza as páginas públicas internas,
autenticação, painel do jogador e administração. Textos, rotas, itens, assets e os títulos dos
shells `auth`, `panel` e `admin` são declarados pelo pacote. Com `home.sections`, o pacote
controla ordem e quais blocos da home aparecem.

O pacote Valorem usa esse contrato para portar a experiência que existia nos templates Django de
`PDL/SITE`: o HTML virou componentes React sem perder a composição, e o comportamento de
`js/theme.js` virou hooks e eventos testáveis. Isso mantém navegação SPA, autenticação,
acessibilidade e integração com as APIs do PDL 2.0.

JavaScript arbitrário e templates HTML executáveis não são carregados do ZIP. Um arquivo desse
tipo teria acesso à sessão do usuário e permitiria XSS persistente. Novos comportamentos entram
como capacidades versionadas do renderer e podem então ser usados por qualquer tema.

O seletor raiz recomendado é:

```css
:root[data-pdl-theme="meu-tema"] {
  --bg: #080808;
  --bg-panel: #151515;
  --gold: #d4af61;
  --text: #f4f1e9;
  --muted: #aaa298;
  --border: rgba(212, 175, 97, .25);
  --panel-sidebar-width: 288px;
  --panel-radius: 6px;
  --panel-text: #f4f1e9;
  --panel-muted: #aaa298;
  --panel-gold: #d4af61;
  --panel-gold-bright: #e6c77d;
  --panel-box-epic: #c4a6e8;
  --panel-box-legendary: var(--panel-gold-bright);
  --panel-surface: #151515;
  --panel-border: rgba(212, 175, 97, .25);
  --theme-text: var(--panel-text);
  --theme-muted: var(--panel-muted);
  --theme-accent: var(--panel-gold);
  --theme-accent-bright: var(--panel-gold-bright);
  --theme-surface: var(--panel-surface);
  --theme-border: var(--panel-border);
  --theme-bg-deep: #100e0b;
  --theme-store-sell: var(--theme-accent, #c5a161);
  --theme-store-buy: var(--theme-info, #6aa8c9);
  --theme-store-package: var(--theme-epic, #c4a6e8);
  --theme-store-craft: var(--theme-success, #7ebc8a);
}
```

Seletores de contexto disponíveis: `html.pdl-public`, `html.pdl-panel`,
`[data-theme-surface="public|auth|panel|admin|overlay"]`, `html[data-panel-density]` e os componentes
compartilhados com `data-theme-part` (`button`, `card`, `page-header`, `admin-category`, `field`, `tabs`, `toast-host`,
`home`, `panel-topbar`, `notification-center` e estados de consulta). Os heróis do admin
(`AdminHeader`, hub, suporte, segurança e observação) usam `page-header` + `--theme-art-bg-*`. O caminho default sempre marca essas superfícies no shell público,
autenticação, painel e toasts. O identificador do pacote é aplicado como `data-pdl-theme` no elemento
`html`; renderers também recebem `data-pdl-renderer`.

O CSS de features do painel (ajuda/companheiro, programas do jogador e painéis admin como
relatórios financeiros, itens customizados e observação de itens) consome tokens `--theme-*` e
`--panel-*` (texto, muted, accent, surface, border, fundo profundo). As folhas estruturais
(`coming-soon.css`, `panel.css`, `auth.css`, páginas públicas e chrome compartilhado) pintam
bordas, glows e barras (progresso do painel, fragmentos, HP, loader, `program-meter`,
`<progress>` do help/Denkynho, thumbs de scroll, o play do trailer da home e os
balões de fala do companheiro) com `color-mix` desses tokens — o ouro clássico
fica só como fallback. Pacotes personalizam essas cores via `theme.css`; os
fallbacks hex preservam a aparência default quando o token não existe.
A vitrine pública de lojas usa `--theme-store-sell`, `--theme-store-buy`,
`--theme-store-package` e `--theme-store-craft` para a cor predominante de cada tipo.

As folhas estruturais em `/theme/public` e `/theme/pages` entram na lista de estilos do default via
chaves lógicas `css/public/*` e `css/pages/*` (por exemplo `css/pages/coming-soon.css`). Fontes e
ícones externos usam `vendor/fonts-public.css`, `vendor/fonts-panel.css` e `vendor/font-awesome.css`
(fallback CDN). Um pacote pode remapear qualquer uma dessas chaves em `assets` sem alterar o
entrypoint. A página Coming Soon é superfície pública tematizada
(`data-theme-surface="public"`, `data-theme-page="coming-soon"`) e carrega
`css/pages/coming-soon.css` pela lista de estilos do tema, não por import local.
O vídeo de entrada do botão Entrar fica em `videos/coming-soon/video.mp4` e é resolvido
por `themeVideo` (o mesmo mapa `assets` do pacote).
O hero da home lê `images/video.mp4` (paisagem) e `images/video-mobile.mp4`
(recorte 9:16), com `video-poster.jpg` / `video-mobile-poster.jpg`. O instalador
aceita `.mp4` nesses assets para o pacote substituir o Classic.

## Segurança e limites

O instalador lê cada entrada e nunca chama a extração direta do ZIP. São bloqueados:

- caminhos absolutos, `..`, nomes duplicados e links simbólicos;
- JavaScript, HTML executável, SVG e extensões não permitidas;
- `@import`, URLs externas, Data URLs e referências a arquivos ausentes no CSS;
- pacotes com mais de 256 arquivos, 64 MB expandidos ou compressão suspeita;
- o identificador reservado `default` e versões fora do contrato PDL 2.0.

Os arquivos são gravados primeiro em diretório temporário e publicados por movimentação
atômica. Falhas de validação ou banco removem o estágio sem alterar o tema ativo.

## Armazenamento e publicação

Pacotes ficam em `MEDIA_ROOT/themes/<tema>/<versão-hash>/` e são entregues sob
`/media/themes/`. Em produção, o volume `media_files` já é compartilhado entre Django, workers
e Nginx. `backend/media/` também é ignorado pelo Git. Preserve o volume `media_files` em
upgrades e backups; ele é a fonte persistente dos temas instalados.

No deploy, o entrypoint cria `/app/media/themes` e corrige sua permissão antes de iniciar a
aplicação. O instalador também cria `MEDIA_ROOT/themes` com todos os diretórios pais, tornando
seguros tanto o primeiro deploy com volume vazio quanto uma execução local sem a pasta criada.

O endpoint público `GET /api/v1/public/theme/` informa o tema ativo. A administração usa
`/api/v1/staff/themes/`; não exponha essas operações sem autenticação e papel de superusuário.

## Validação

Além das suítes completas do projeto, confira:

```bash
cd backend
python -m pytest apps/themes/tests

cd ../frontend
npm run test:run -- src/theme/ThemeProvider.test.tsx src/theme/theme.test.tsx src/components/themes/PortalTheme.test.tsx src/components/auth/AuthPanel.test.tsx src/components/layout/PrivateLayout.test.tsx src/pages/admin/AdminThemesPage.test.tsx src/services/domain/theme.service.test.ts
```

Homologue o catálogo de componentes, uma página pública, autenticação e painel em desktop e
celular. Verifique também a restauração do default depois de ativar um pacote.
