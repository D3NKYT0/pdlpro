# Ícones de itens e skills

[Índice](../README.md) · [Catálogo de itens](catalogo-de-itens.md)

Os ícones estáticos dos XMLs ficam em `frontend/public/`, com um arquivo por ID. Essas pastas são geradas; a documentação e as regras de resolução ficam separadas delas.

| Pacote | Pasta gerada | URL | Formato |
| --- | --- | --- | --- |
| Itens | `frontend/public/item-icons/` | `/item-icons/<ID>.jpg` | JPG (`57.jpg` é Adena) |
| Skills | `frontend/public/skill-icons/` | `/skill-icons/<ID>.png` | PNG (`1.png` é a skill 1) |

## Importar e empacotar itens

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

## Importar e empacotar skills

Os PNGs de origem no padrão do cliente (`skill0001.png`) são copiados como `<ID>.png`. Variantes, chrome da janela de skills e nomes especiais (`skill0761_2.png`, `SkillWnd_*`) são ignorados.

```powershell
$env:PDL_SKILL_ICON_SOURCE = "D:\caminho\para\os\icones"
npm run skill-icons
```

Em Bash:

```bash
PDL_SKILL_ICON_SOURCE=/caminho/para/icones npm run skill-icons
```

O comando recria `frontend/assets/skill-icons.tar.gz`. Para apenas empacotar os arquivos já presentes, use `npm run skill-icons:pack`.

## Desenvolvimento e publicação

Os arquivos individuais gerados não são versionados. Os hooks `predev` e `prebuild` restauram os dois pacotes quando necessário. Também é possível chamar `npm run icons:ensure` e `npm run skill-icons:ensure` explicitamente.

Ao adicionar ícones, publique o pacote atualizado e o novo build estático. Confira se o arquivo responde no ambiente publicado (`/item-icons/<ID>.jpg` ou `/skill-icons/<ID>.png`). A ficha do personagem consome `icon_url` em `/api/v1/customer/server/characters/<id>/skills/`. Os nomes e as pastas da janela L2 (`group`: physical, magic, reinforcement, weaken, special, other) vêm do XML em `LINEAGE_SKILL_XML_DIR` (padrão `data/skills`): `operateType` separa Active/Passive, `skillType` + `isMagic` montam as pastas, e nomes de clan/herói/mentoria vão para a pasta especial. A referência de textura do XML não é uma URL de imagem do navegador; nomes, aliases e fallback de itens são resolvidos no backend.

Imagens enviadas para itens customizados ficam em mídia, não neste pacote, e não exigem rebuild do frontend. Veja o [catálogo composto](catalogo-de-itens.md).
