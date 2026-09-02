# Catálogo de itens do Lineage 2

Este diretório contém os XMLs usados pelo PDL para identificar itens do Lineage 2.
O catálogo fornece uma fonte única de metadados para loja, inventário, equipamentos,
leilão, marketplace, jogos, recompensas e ferramentas administrativas.

O catálogo descreve os itens para o painel. Ele não cria, altera ou remove itens no
banco do jogo.

## Configuração

O diretório de leitura é definido por `LINEAGE_ITEM_XML_DIR`:

```env
LINEAGE_ITEM_XML_DIR=data/items
```

Caminhos relativos são resolvidos a partir do diretório do backend. Também é possível
informar um caminho absoluto para manter os XMLs fora do repositório.

Ao carregar o catálogo, o backend percorre recursivamente todos os arquivos `*.xml` do
diretório configurado. São reconhecidos os elementos `weapon`, `armor` e `etcitem`.
Para cada item, o catálogo resolve:

- ID e nome;
- categoria;
- grade;
- possibilidade de negociação;
- referência de ícone;
- URL pública da imagem.

Itens sem nome ou marcados como não utilizados são ignorados. Quando um ID não existe
no catálogo, a interface usa o nome `Item <ID>`, o ícone padrão e não o considera
negociável.

## Catálogo consolidado

O catálogo servido pelo PDL combina duas fontes:

1. os XMLs encontrados em `LINEAGE_ITEM_XML_DIR`;
2. os itens customizados ativos cadastrados no banco do painel.

Os XMLs têm prioridade. Um item customizado não pode reutilizar um ID já definido nos
arquivos e, caso um XML adicionado posteriormente passe a utilizar o mesmo ID, a
definição do XML prevalece.

Itens customizados são gerenciados em:

```text
/painel/admin/itens/customs
```

O cadastro aceita nome, imagem, categoria, grade, negociação e metadados adicionais.
As imagens enviadas ficam em `media/custom-items/`. Criar um registro customizado no
PDL não adiciona o item ao game server ou ao cliente; o mesmo ID precisa existir e
estar configurado nesses componentes.

## API

O catálogo consolidado está disponível em:

```http
GET /api/v1/public/items/catalog/
```

Cada item inclui os metadados normalizados usados pelas demais APIs do sistema. O
frontend não mantém um catálogo JSON separado e não tenta descobrir nomes, categorias
ou URLs de imagens por conta própria.

## Ícones

Os itens definidos por XML usam arquivos estáticos no formato:

```text
frontend/public/item-icons/<ID>.jpg
```

O XML pode conter uma referência de textura do cliente, mas essa referência não é a
imagem exibida no navegador. O JPG correspondente precisa existir nos assets do
frontend. IDs com aliases conhecidos e itens ausentes são resolvidos pelo backend;
para os demais casos, é usado `frontend/public/item-icons/default.jpg`.

Para importar uma pasta de JPGs e atualizar o pacote de deploy, informe o diretório de
origem e execute, dentro de `frontend`:

```powershell
$env:PDL_ITEM_ICON_SOURCE = "D:\caminho\para\os\icones"
npm run icons
```

O importador aceita arquivos no formato `<ID>.jpg` e também normaliza nomes no formato
`5-<ID>.jpg`. Para apenas recriar o pacote usando os arquivos que já estão em
`frontend/public/item-icons/`, execute `npm run icons:pack`.

Imagens de itens customizados são servidas pela área de mídia e não exigem rebuild do
frontend.

## Cache e atualização

Os XMLs são mantidos em cache pelo processo do backend. Após alterar os arquivos ou o
valor de `LINEAGE_ITEM_XML_DIR`, reinicie os processos do backend para recarregá-los.

Itens customizados são consultados a cada requisição e podem ser criados, editados,
ativados ou desativados sem reiniciar o backend. No frontend, o catálogo possui cache
de 60 segundos e é revalidado quando a tela volta a ser utilizada.

Alterações apenas em nomes e metadados não exigem rebuild do frontend. Novos ícones
estáticos precisam ser incluídos nos assets publicados.

## Verificação rápida

Depois de atualizar o catálogo:

1. reinicie o backend;
2. consulte `GET /api/v1/public/items/catalog/`;
3. confirme o nome, a categoria, a grade e a negociação do item;
4. abra a URL indicada em `icon_url` e verifique a imagem;
5. teste o item nas telas que o utilizam antes de publicar a alteração.

Para informações sobre cadastro, permissões e armazenamento de imagens customizadas,
consulte a [documentação de configuração](../../../docs/configuration.md).
