# Ícones de itens e skills

[← Índice](../README.md) · [Fonte única](../projeto/fonte-unica.md) · [Catálogo de itens](catalogo-de-itens.md)

> **Atualizado:** 25 de setembro de 2026

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

Quando um ID usa uma textura com outro nome, use o campo `icon` do XML do datapack para localizar a imagem de origem. Por exemplo, as skills `1320`, `1321` e `1322` do Eternity compartilham `icon.skill0172`. Empacote uma cópia por ID para que as URLs diretas funcionem. `LINEAGE_QUERY_MODULE=eternity` carrega os metadados dos diretórios `backend/data/items-by-query-module/eternity` e `backend/data/skills-by-query-module/eternity`. Esses XMLs prevalecem sobre os catálogos padrão. Diretórios próprios configurados em `LINEAGE_ITEM_XML_DIR` e `LINEAGE_SKILL_XML_DIR` têm prioridade para IDs em comum.

O catálogo do Eternity foi normalizado a partir dos XMLs do datapack entregue pelo operador. Os itens preservam nome, tipo, slots e indicação de negociação. Itens sem indicação explícita e sem uma regra no catálogo padrão ficam indisponíveis para negociação. As skills usam `nameEn`, o tipo de operação (`P` para passiva e `T` para alternável) e os limites definidos em `enchantSkillGroups.xml`. Imagens sem textura exata disponível usam o ícone padrão.

O ícone do Anakim Outfit (`23881`) foi obtido pelo mesmo ID no catálogo Grand Crusade, que publica a textura `g_co_anakim_i00`. [Ficha do Anakim Outfit](https://l2i-gc.gaikotsu.ru/item_23881-Naryad-Anakim)

Ao adicionar ícones, publique o pacote atualizado e o novo build estático. Confira se o arquivo responde no ambiente publicado (`/item-icons/<ID>.jpg` ou `/skill-icons/<ID>.png`). A ficha do personagem consome `icon_url` em `/api/v1/customer/server/characters/<id>/skills/`. Os nomes e as pastas da janela L2 (`group`: physical, magic, reinforcement, weaken, special, other) vêm do XML em `LINEAGE_SKILL_XML_DIR` (padrão `data/skills`): `operateType` separa Active/Passive, `skillType` + `isMagic` montam as pastas, e nomes de clan/herói/mentoria vão para a pasta especial. O encanto (+0…+N) não é uma coluna à parte: o `skill_level` acima de `levels` é a rota `enchantLevels1`/`enchantLevels2` do XML. A referência de textura do XML não é uma URL de imagem do navegador; nomes, aliases e fallback de itens são resolvidos no backend.

Imagens enviadas para itens customizados ficam em mídia, não neste pacote, e não exigem rebuild do frontend. Veja o [catálogo composto](catalogo-de-itens.md).
