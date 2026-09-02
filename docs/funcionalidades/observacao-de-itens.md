# Observação de itens e economia

[← Índice da documentação](../README.md)

Em `/painel/admin`, acesse **Servidor → Observar itens** (`/painel/admin/itens`).
Esta é uma tela operacional nativa do frontend, não uma tela do Django Admin.
O painel traz a
observação de inflação do projeto SITE: totais por localização, busca por nome/ID,
quantidade mínima, categorias, ordenação, favoritos pessoais e comparação entre
snapshots diários. Os nomes vêm do catálogo XML configurado em `LINEAGE_ITEM_XML_DIR`, agregado aos customs ativos do banco;
itens sem nome conhecido aparecem como `Item <ID>`.
Todas as telas e autocompletes consomem o catálogo canônico em
`/api/v1/public/items/catalog/`. A API resolve ID, nome, tipo, grau, negociação e
`icon_url`, incluindo aliases e imagem padrão. O frontend não monta URLs de ícones
nem mantém JSON próprio. Ícones XML permanecem assets estáticos em `/item-icons/`; imagens dos customs ficam em `/media/custom-items/`.
Itens desconhecidos
mostram “Fora do catálogo”. O grau/tipo exibido no histórico é do catálogo atual; nomes e quantidades
salvos no snapshot são preservados. Após trocar arquivos XML, reinicie o backend
para recarregar o catálogo em cache. O cache compartilhado do navegador tem validade
de 60 segundos e revalida ao voltar à aba ou montar um consumidor.
APIs de loja/carrinho, inventário, equipamentos, leilões, marketplace, jogos/recompensas
e configuração staff enriquecem seus dados com o mesmo catálogo; preços, quantidades,
IDs de registros e valores históricos não são alterados.
O XML contém referências a texturas do cliente,
não as imagens: itens definidos por XML precisam de seu JPG em `frontend/public/item-icons/`.
Os JPGs gerados são empacotados em `frontend/assets/item-icons.tar.gz`. Os scripts
`predev` e `prebuild` restauram automaticamente o catálogo quando a cópia de trabalho
contém apenas o placeholder. Depois de atualizar as fontes locais, execute
`npm run icons` para importar e recriar o arquivo usado no deploy.
Customs cadastrados no painel usam a imagem enviada para media, sem rebuild do frontend.

## Capturas, permissões e persistência

As consultas são SELECTs executados em uma transação MySQL somente leitura.
Os módulos `dreamv3`, `lucerav2` e `mobius` possuem SQL específico para seus schemas.
O recorte inclui INVENTORY, WAREHOUSE e PAPERDOLL de personagens com accesslevel=0,
além de CLANWH com dono válido em clan_data. Pets, correio, itens de GM e itens
órfãos não fazem parte desse recorte. O inventário do painel aparece separado como SITE.
Uma captura com mais de 100 mil grupos é recusada, nunca salva parcialmente.

Favoritos são privados por usuário e origem L2. Categorias e snapshots são salvos
somente no banco do painel; nenhuma migration modifica o banco do jogo. Há no máximo
um snapshot por dia/origem. Categorias são preservadas pelo nome no histórico, mesmo
se forem excluídas depois. Comparações exigem a mesma origem e datas crescentes.
Uma entrada sem quantidade anterior aparece como “Novo”, sem percentual artificial.

Além do acesso à área staff, a equipe precisa de `server.view_itemobservationsnapshot` para
consultar o painel e `server.capture_itemobservationsnapshot` para criar snapshots.
Criar, editar e excluir categorias exige respectivamente `server.add_itemobservationcategory`,
`server.change_itemobservationcategory` e `server.delete_itemobservationcategory`.
Excluir snapshots exige `server.delete_itemobservationsnapshot`.
Superusuários já possuem todas essas permissões. Elas podem ser atribuídas a grupos
ou usuários; os dados de observação não são gerenciados pelo Django Admin.
As APIs em `/api/v1/staff/item-observation/` verificam as permissões em cada operação;
as escritas autenticadas por cookie exigem CSRF. Quantidades são retornadas como texto
para preservar a precisão de inteiros grandes no navegador.
O deploy de produção aplica a migration `server.0003` e recompila o frontend.
Quem já aplicou essa migration mantém categorias, favoritos e snapshots existentes.
