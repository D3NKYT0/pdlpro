# Changelog

[← Índice da documentação](../README.md)

Todas as mudanças relevantes do PDL PRO serão registradas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não publicado]

### Adicionado

- Testes de autorização, identidade, pagamentos, carteira, inventário, comércio,
  infraestrutura e atendimento no backend; contratos HTTP, sessão, rotas e
  interações de telas no frontend. [Resultados e limites](2026-09-02-testes.md).
- Cobertura com pisos verificados, Testing Library/jsdom, checagem de tipos dos
  testes e workflow de qualidade para backend e frontend.
- Política obrigatória de testes para novas features e correções em `AGENTS.md`
  e no guia de desenvolvimento.
- Guias de testes, frontend, pagamentos, backup/restauração e diagnóstico, com
  documentação organizada por assunto em `docs/` e índice central.

- Relatórios financeiros na central administrativa: saldos, fluxo de caixa diário,
  pedidos e pagamentos, e reconciliação de carteiras, com filtros, totais, paginação
  e gráfico de movimentações. APIs restritas à equipe; bônus incluídos na reconciliação
  e totais de pagamentos separados por BRL/USD.
- Documentação de desenvolvimento, configuração, API e implantação.
- Guias de contribuição e segurança.
- Licença source-available explícita, permitindo acesso, estudo, modificação para
  uso próprio e redistribuição gratuita, com comercialização por terceiros
  proibida.

### Removido

- Rede social: feed, curtidas, comentários, amizades e chat entre jogadores.

### Corrigido

- Autorização de personagem na consulta de inventário e sinal de saídas no extrato.
- Limpeza da seleção ao trocar de conta no inventário e bloqueio de publicação
  duplicada de personagem no marketplace enquanto a requisição está pendente.
- Cotação por código de pacote, validação de identificador OAuth, desafios 2FA
  malformados e autenticação de contas desativadas entre as etapas.
- Conversão de transports e tratamento de falhas de verificação de passkeys.

### Alterado

- README principal focado na apresentação do produto e nos caminhos de leitura;
  explicações detalhadas e guias centralizados nas pastas de `docs/`.
- Documento de arquitetura ampliado com dependências, DI e fluxo de implementação.
- Swagger UI e ReDoc com o tema ouro/escuro do frontend e do Jazzmin.

## [2.0.0] - 2026-08-31

### Adicionado

- Monorepo com backend Django/DRF e frontend React/Vite.
- Autenticação por cookies JWT, perfil, 2FA, progresso e recompensas.
- Integração configurável com bancos Lineage 2 nos módulos Lucera v2 e Dream v3.
- Carteira, loja, pagamentos, inventário, marketplace e leilões.
- Conteúdo, clãs, feed social, amizades, chat e notificações.
- Jogos, bônus diário, caixas, economia e passe de batalha.
- Docker Compose com PostgreSQL, Redis, Gunicorn, Daphne, Celery, Nginx e frontend de desenvolvimento.
