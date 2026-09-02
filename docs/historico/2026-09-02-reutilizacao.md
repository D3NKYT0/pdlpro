# Consolidação de componentes e regras — 02/09/2026

[Índice](../README.md) · [Componentes](../desenvolvimento/componentes.md) · [Reutilização](../arquitetura/reutilizacao.md)

Registro da revisão de código repetido no backend e frontend. Os resultados abaixo descrevem esta execução local; não substituem validação de uma revisão futura.

## Alterações

- Biblioteca compartilhada de botões, links de ação, campos, cartões, cabeçalhos, estados de consulta, abas, alternância e paginação; telas existentes migradas para consumi-la.
- Botões com as texturas originais do painel: principal, secundário, sucesso, atenção e perigo; tamanhos compacto, padrão e amplo, ícones e carregamento.
- Largura determinada pelo conteúdo. Removidas 69 declarações de largura/min-width dispersas no CSS, incluindo preenchimento artificial da linha em telas pequenas.
- Catálogo local com o mesmo hook de tema usado no painel, exemplos interativos e entrada em `/ui.html` durante o desenvolvimento.
- Hooks compartilhados para ações assíncronas, bloqueio de repetição e mensagens de falha. Jogos e formulários administrativos passaram a usar essa base.
- Histórico e status de atendimento compartilhados, com filtragem de notas internas no modo jogador.
- Formatação compartilhada de BRL/data e interpretação de mensagens públicas de erro.
- Backend: disponibilidade dos jogos, validação de personagem offline, geração de slug de conteúdo e contexto de Swagger/ReDoc consolidados.
- Guias de componentes e reutilização, índice atualizado e regras para novas features em `AGENTS.md`.

## Validação automatizada

| Verificação | Resultado |
| --- | --- |
| Pytest completo com cobertura | 710 testes aprovados |
| Cobertura backend | 88,37% das linhas; 85,08% na métrica combinada de linhas e branches |
| Vitest completo com cobertura | 580 testes aprovados em 42 arquivos |
| Cobertura frontend | 70,51% linhas; 67,31% statements; 59,43% funções; 56,14% branches |
| Biblioteca `components/ui` | 100% linhas e funções; 96,20% branches |
| Ruff | Sem erros, incluindo o script de auditoria |
| Django check e verificação de migrações | Sem problemas; nenhuma migração pendente |
| TypeScript e build | Aprovados |

Foram acrescentados 14 testes no backend e 27 no frontend. Os cenários incluem bloqueio de ações repetidas, envio explícito de formulário, links, teclado nas abas e nos controles, limites de paginação, notas internas e políticas compartilhadas. Os limites mínimos de cobertura foram preservados.

O build ainda avisa sobre um chunk JavaScript maior que 500 kB. O backend apresenta dois avisos de depreciação do Daphne com Python 3.14. O frontend ainda não tem ESLint configurado, conforme o [guia de testes](../desenvolvimento/testes.md).

## Conferência visual e limites

O tema foi comparado com o painel existente. O catálogo foi conferido no Chrome em desktop e viewport de 390 × 844: variantes com a arte original, botões com largura proporcional ao conteúdo, formulário bloqueado durante envio e confirmação ao concluir. Um overflow do checkbox oculto foi corrigido; a largura do conteúdo ficou igual à largura disponível no celular.

A auditoria sintática final não encontrou grupos dentro dos limites configurados. Isso não comprova ausência de toda duplicação: a ferramenta exige janelas/corpos idênticos e revisão humana continua necessária. Layouts e regras particulares de cada domínio permanecem separados.

Os testes não homologam transações contra um game server, banco SQL ou provedor de pagamento real. A conferência do catálogo não equivale a uma suíte E2E de todas as telas.
