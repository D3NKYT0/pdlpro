# Exclusão de cadastros no painel

[← Índice](../README.md) · [Permissões](../operacao/papeis-e-permissoes.md) · [Testes](../desenvolvimento/testes.md)

> **Atualizado:** 13 de outubro de 2026

O administrador pode excluir notícias publicadas ou em rascunho, produtos e pacotes da loja, cupons, configurações de jogos e metadados de itens customizados diretamente no painel. FAQ, Wiki, calendário, downloads, banners, notificações e roadmap já possuem ações de exclusão.

## Uso

Escolha **Excluir** no cadastro e confirme o nome apresentado. Cancelar mantém o registro. Durante o envio, a ação fica bloqueada; uma falha mantém o cadastro e apresenta a mensagem da API. Após sucesso, a lista e as consultas relacionadas são atualizadas. Se o registro estava aberto no editor, a edição é encerrada.

Despublicar ou desativar continua disponível para retirar um cadastro de uso preservando seu conteúdo. A exclusão é definitiva e exige a capacidade de gerenciamento da área: `content.manage`, `commerce.manage`, `games.manage` ou `items.manage`. Itens customizados também exigem `server.delete_customcatalogitem`; a interface usa a permissão retornada pela API.

## Vínculos e histórico

- Produtos com linhas em carrinhos ou que integram pacotes não podem ser excluídos. Retire os vínculos ou desative o produto.
- Pacotes presentes em carrinhos não podem ser excluídos. Um pacote sem esses vínculos pode ser removido junto com sua composição; os produtos permanecem.
- Cupons com contador de uso ou compras registradas com seu código não podem ser excluídos.
- Compras guardam uma fotografia dos itens adquiridos. Excluir um produto ou pacote não altera esses históricos, saldos, comissões ou itens entregues.
- Conteúdo de jogos com dependências não pode ser excluído, incluindo relações que normalmente usariam cascata ou anulariam uma referência. Temporadas com níveis/progresso, recompensas resgatadas, prêmios com giros e iscas no estoque de jogadores permanecem preservados.
- A exclusão de uma configuração de jogo remove sua ativação e parâmetros; não apaga jogadas, inventários ou conteúdo. A autoconfiguração pode recriar a configuração posteriormente.
- Excluir um item customizado remove seus metadados locais. Nenhum item é apagado do servidor Lineage, nem são modificados os inventários ou históricos dos jogadores.

Conteúdo de jogos oferece a ação tanto na página de conteúdo quanto no configurador de cada jogo: temporadas, níveis, recompensas, missões, trocas, marcos, bônus diário, iscas, prêmios, peixes, monstros, itens de caixas e missões de caça.

Configurações globais, disponibilidade de recursos, candidaturas/revisões de apoiadores, solicitações de saque e registros financeiros continuam usando suas operações próprias. Eles não são cadastros descartáveis: não recebem uma ação genérica que apagaria configuração obrigatória ou trilhas de operações.

## API e implementação

- `DELETE /api/v1/staff/news/`, `/staff/shop/` e `/staff/games/`: corpo JSON com `id` UUID obrigatório.
- `DELETE /api/v1/staff/commerce/{packages|promos}/{id}/`.
- `DELETE /api/v1/staff/game-content/{kind}/{id}/`.
- `DELETE /api/v1/staff/custom-items/{id}/`.

Uma exclusão bem-sucedida retorna `{"deleted": true}`. Repetir a operação sobre o mesmo UUID retorna `{"deleted": false}` sem efeitos adicionais. Identificadores inválidos são recusados; dependências retornam erro de validação traduzido. Os casos de uso consomem portas do app proprietário, e os adaptadores executam a verificação de referências e exclusão sob transação e lock do cadastro.

`DeleteRecordButton` centraliza confirmação, bloqueio de repetição e feedback, usando os botões e traduções compartilhados. Cada tela permanece responsável pelo fechamento de seu editor e pela invalidação das consultas.

## Cenários de validação

Os testes verificam exclusão e repetição, publicação removida da consulta pública, UUID inválido, acesso anônimo/jogador/leitor negado, permissão específica de itens customizados, dependências preservadas, composição de pacotes, fotografias de compras e mensagens traduzidas. No frontend, cobrem contratos HTTP, ações nas telas, cancelamento, envio em andamento, falha, sucesso e estados de consulta de notícias.
