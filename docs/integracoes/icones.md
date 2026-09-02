# Ícones de itens

[Índice](../README.md) · [Catálogo de itens](catalogo-de-itens.md)

Os ícones estáticos dos itens XML ficam em `frontend/public/item-icons/`, com um JPG por ID (`57.jpg` representa Adena). Essa pasta de assets é gerada; a documentação e as regras de resolução ficam separadas dela.

## Importar e empacotar

Dentro de `frontend/`, indique a pasta de origem e execute o importador:

```powershell
$env:PDL_ITEM_ICON_SOURCE = "D:\caminho\para\os\icones"
npm run icons
```

Em Bash:

```bash
PDL_ITEM_ICON_SOURCE=/caminho/para/icones npm run icons
```

O importador aceita `<ID>.jpg` e normaliza nomes `5-<ID>.jpg`. O comando também recria `frontend/assets/item-icons.tar.gz`, pacote versionado utilizado no deploy. Para apenas empacotar os arquivos já presentes, use `npm run icons:pack`.

## Desenvolvimento e publicação

Os JPGs individuais gerados não são versionados. Os hooks `predev` e `prebuild` executam o script que restaura o pacote quando necessário. Também é possível chamar `npm run icons:ensure` explicitamente.

Ao adicionar ícones, publique o pacote atualizado e o novo build estático. Confira a `icon_url` retornada pelo catálogo e se o arquivo responde no ambiente publicado. A referência de textura do XML não é uma URL de imagem do navegador; nomes, aliases e fallback são resolvidos no backend.

Imagens enviadas para itens customizados ficam em mídia, não neste pacote, e não exigem rebuild do frontend. Veja o [catálogo composto](catalogo-de-itens.md).
