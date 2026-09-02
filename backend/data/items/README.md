Catálogo Lineage 2 (Interlude) usado para nome, grade e ícone dos itens.

Fonte: os mesmos XML do Omega Team (`backend/data/items`).
Ícones: `frontend/public/item-icons/{id}.jpg`.

Fonte única: `LINEAGE_ITEM_XML_DIR` no backend (esta pasta por padrão).
ID, nome, categoria, grau, negociação e URL de ícone são servidos por
`GET /api/v1/public/items/catalog/`. Não existe JSON gerado no frontend.

Após atualizar XML, reinicie os processos do backend para recarregar o catálogo.
O navegador compartilha um cache da API por 60 segundos, revalidado ao voltar à
aba ou montar um consumidor. Não é necessário rebuild do frontend para nomes/metadados.
Os JPGs continuam sendo arquivos estáticos; o backend é quem resolve suas URLs
e eventuais aliases. Novas imagens precisam ser publicadas junto aos assets.
