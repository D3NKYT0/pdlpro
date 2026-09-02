# API do catálogo de itens

[← Índice da documentação](../README.md)

`GET /api/v1/public/items/catalog/` é público e independe da conexão com o jogo.
Retorna `items` e `default_icon_url`. Cada item contém `id` (ID L2 como string),
`name`, `category`, `grade`, `tradeable`, `catalog_found`, `icon_url` e
`icon_reference` (referência de textura do XML, não uma URL de imagem), `source`
(`xml` ou `custom`) e `metadata` (objeto JSON adicional para customs).
As URLs de ícone são resolvidas exclusivamente pelo backend. O cache HTTP é de 60 segundos.

APIs que apresentam itens atuais também retornam `item_metadata` e `icon_url`,
resolvidos pelo mesmo serviço. `name`/`item_name` refletem o catálogo, sem alterar
quantidades, preços, IDs comerciais (UUID) ou registros persistidos. IDs desconhecidos
recebem `Item <ID>`, metadados nulos e a imagem padrão, sem adivinhar por nome.
Snapshots mantêm o nome capturado, explicitamente histórico; tipo/grau/ícone são atuais.
O frontend compartilha uma única consulta em cache, inclusive para autocomplete,
e não possui catálogo JSON ou regras próprias de nomes/ícones.

Customs são gerenciados em `/api/v1/staff/custom-items/`: GET lista paginada, permissões
e opções de tipo/grau; POST cadastra usando multipart com `image` e `metadata` JSON.
`/api/v1/staff/custom-items/<uuid>/` aceita GET e PATCH (JSON ou multipart).
`item_id` é o ID L2 imutável; `id` é o UUID do registro no PDL. Não existe DELETE:
use PATCH com `active: false` para desativar. Uploads autenticados por cookie exigem CSRF.
