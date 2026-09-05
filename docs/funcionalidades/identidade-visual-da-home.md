# Identidade visual da página inicial

[Índice](../README.md) · [Frontend](../desenvolvimento/frontend.md) · [Temas](temas.md)

A página inicial do tema padrão usa uma coleção própria de arte em `frontend/public/theme/default/images/home/`. As imagens mantêm a direção de fantasia sombria do PDL: preto, ouro envelhecido, azul-petróleo e luz volumétrica. Nenhum arquivo contém texto ou logotipo, para que títulos e links permaneçam componentes HTML acessíveis e traduzíveis.

## Mapa das artes

| Arquivo | Uso |
| --- | --- |
| `aden-guardian-v2.webp` | Guardião transparente atrás dos três destaques principais |
| `chronicle-rates-v2.webp` | Cartão de crônica e progressão |
| `castle-siege-v2.webp` | Cartão de guerra de castelos |
| `hall-of-fame-v2.webp` | Cartão do hall da fama |
| `archive-v2.webp` | Fundo dos arquivos do reino e cartão de notícias |
| `clans-v2.webp` | Fundo do pódio de clãs |
| `rankings-v2.webp` | Fundo dos rankings |
| `cinematic-v2.webp` | Fundo do trailer e cartão do roadmap |

O componente [HomePage](../../frontend/src/pages/HomePage.tsx) resolve todos os caminhos com `themeImage`. Os cenários de seção chegam ao CSS pela propriedade `--section-art`; os gradientes em [home-extras.css](../../frontend/public/theme/pages/home-extras.css) preservam o contraste do conteúdo sem gravar sombras na própria imagem.

## Regras de manutenção

- Crie uma nova versão do arquivo ao substituir uma arte; não sobrescreva silenciosamente a anterior durante a produção.
- Preserve uma área de baixo detalhe atrás do conteúdo e teste os recortes desktop e celular.
- O guardião precisa manter canal alfa. Não use uma imagem retangular opaca nessa camada.
- Comprima os arquivos para WebP antes de publicá-los e mantenha texto, marca e botões fora da imagem.
- Ao alterar o mapa, atualize os cenários de [HomePage.test.tsx](../../frontend/src/pages/HomePage.test.tsx) e confira a página com o tema carregado.
