# Templates públicos clássicos

[Índice](../README.md) · [Temas](temas.md) · [Extensões](../arquitetura/extensoes.md)

O `presentation.renderer` do tema ZIP **escolhe** um layout do catálogo. Não cria um
layout novo. Os 20 nomes abaixo são React homologado no core: o pacote manda textos,
rotas e artes; o ZIP continua sem HTML/JS.

`portal-v1` e `club-v1` permanecem no instalador como aliases de **Gemwright** e
**Vesperlyn**. Pacotes antigos não quebram.

Layout que nenhum destes cobre (outro casco em React) continua sendo
[extensão de cliente](../arquitetura/extensoes.md) — não um 21º renderer “pra galera”.

## Como escolher

No `theme.json`:

```json
{
  "presentation": {
    "renderer": "ironspine"
  }
}
```

O `ThemeProvider` grava `data-pdl-renderer` com o id do ZIP e `data-pdl-template`
com o nome canônico. A folha `css/pages/templates.css` pinta por
`[data-theme-template]` / `[data-pdl-template]`.

## Catálogo

Nomes fictícios. A composição é o que muda — não a paleta.

| Id | Nome | O que o visitante vê | De onde veio o arquétipo |
| --- | --- | --- | --- |
| `vesperlyn` | Vesperlyn | Vídeo full-bleed, wordmark, dois CTAs, faixa de stats, doca | Landings 2024 (Aether / Saga). Alias `club-v1` |
| `gemwright` | Gemwright | Countdown, botões de gema, cards de ícone | Portal Valorem / PDL SITE. Alias `portal-v1` |
| `ironspine` | Ironspine | Banner, menu esquerdo, poço de notícias, widgets | Sites L2 2008 (PHP-Fusion / L2J) |
| `ashenledger` | Ashen Ledger | Manchete, colunas, ranking na lateral | Gazeta do reino, não hall da fama |
| `warhorn` | Warhorn | Relógio de siege, alistamento, relatórios | Comando de guerra / countdown militar |
| `ironpatch` | Ironpatch | Download primeiro, changelog ao lado | Launcher / updater |
| `laurelwake` | Laurelwake | Pódio acima da dobra | Hall da fama |
| `meridian` | Meridian | Rates e crônica abertos, features em capítulos | Essence / Chronicles “check, don't believe” |
| `twinwake` | Twinwake | Criar conta \| baixar cliente, 50/50 | Chronicles: dois caminhos iguais |
| `cartograph` | Cartograph | Features viram regiões do mapa | Atlas do reino |
| `classing` | Classing | Cards altos de caminho (classe) | Tela de seleção de personagem |
| `parchment` | Parchment | Coluna estreita, capítulos romanos | Manuscrito / lore |
| `obsidian` | Obsidian | Emblema, dois atos, ticker | Luxo mínimo |
| `hearthspire` | Hearthspire | Mural de recados antes do ranking | Taverna / comunidade |
| `goldleaf` | Goldleaf | Brasão central, decretos, corte | Home heráldica |
| `lampmarket` | Lampmarket | Features como bancas, CTA de loja | Bazar (Giran) |
| `bracket` | Bracket | Tabela/chave primeiro | Grand Olympiad |
| `eventide` | Eventide | Palco de vídeo, depois fila notícia+ranking | Essence “the journey comes alive” |
| `wayfarer` | Wayfarer | Três passos numerados | Onboarding Essence / Chronicles |
| `watchfire` | Watchfire | Números do servidor como hero | Status bar virada página |

`gemwright` (e `portal-v1`) recusam `home.sections` com `stats` ou `pillars`. Os
outros aceitam o contrato completo.

## Camada no código

```text
frontend/src/theme/templates/     catálogo, resolve, casco, homes
frontend/public/theme/pages/templates.css
backend/apps/themes/application/template_catalog.py
```

Vesperlyn e Gemwright continuam em `ClubTheme` / `PortalTheme`. Os outros 18
passam por `TemplateShell` + `CatalogHomePage`.

## Testes

```bash
cd frontend
npm run test:run -- src/theme/templates src/theme/renderers.test.ts src/theme/accent-chrome.test.ts

cd ../backend
python -m pytest apps/themes/tests/test_theme_api.py -k "club_renderer or catalog_renderer or declarative_presentation"
```
