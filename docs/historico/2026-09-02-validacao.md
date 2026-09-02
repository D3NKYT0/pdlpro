# Validação de programas e recompensas — 02/09/2026

[← Índice da documentação](../README.md)

Registro preservado da documentação anterior. Os resultados descrevem aquele ambiente e aquela execução; não comprovam o estado de outra instalação nem substituem uma nova validação.

- Backend: 258 testes aprovados. Frontend: 39 testes aprovados. Build de produção concluído; permanece o aviso de tamanho do bundle principal.
- Django sem erros de configuração e sem migrações faltantes na definição dos modelos.
- Navegador: desktop de 1280/1440 px e celular de 390 px. Conferidos painel do apoiador, análise e crédito de comissão, loja e histórico, passe/missões/trocas/marcos/histórico, bônus diário, iscas/coleção/ranking, carteira ↔ jogo, administração dos recursos, editores de recompensas/cupons e roadmap público/detalhe/admin.
- Na base isolada: compra de pacote com cupom e bônus; candidatura analisada e comissão solicitada/creditada; bônus resgatado; isca comprada e consumida; captura registrada; missão resgatada, dois níveis resgatados automaticamente com premium ainda bloqueado; troca e marco registrados no histórico; roadmap publicado; módulo desativado e reativado.
- Corrigidos durante a inspeção: sobreposição do rodapé do menu, checkbox herdando dimensões de campo de texto, alinhamento das métricas, títulos sem contraste no site público, datas com fuso negativo e navegação pública estreita.
- Transferência com o Lineage real: **não homologada**, conforme preparação acima. Nenhum saldo ou inventário real do jogo foi movimentado nesta validação.
- A verificação **somente leitura** do banco Lineage configurado encontrou `characters` e `items_delayed` em **MyISAM**, `items` em InnoDB e nenhuma tabela `pdl_exchange_receipts`. A conexão está acessível, mas faltam os requisitos transacionais. Conversão de engine e criação de recibos no servidor real não foram executadas; exigem autorização, backup e planejamento operacional.
