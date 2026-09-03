# Changelog

[← Índice da documentação](../README.md)

Todas as mudanças relevantes do PDL PRO serão registradas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não publicado]

Nenhuma alteração pendente de publicação.

## [2.1.0] - 2026-09-02

### Adicionado

- Sistema global de temas instaláveis por ZIP, com API pública do tema ativo e
  administração restrita a superusuários para instalar, ativar, restaurar e remover
  pacotes.
- Renderer declarativo `portal-v1`, com identidade visual aplicada à home, páginas
  públicas internas, autenticação, painel do jogador e administração React.
- Tema Valorem de referência, baseado no projeto `PDL/SITE`, com composição portada
  para React, menu móvel, countdown, cards de sistemas, rankings interativos, CTA,
  notícias, shells privados e assets próprios.
- Contrato estável de superfícies e componentes temáticos por meio de
  `data-theme-surface` e `data-theme-part`, abrangendo botões, cards, campos, abas,
  cabeçalhos e estados de consulta.
- Criação automática de `MEDIA_ROOT/themes` pelo deploy e pelo instalador, permitindo
  o primeiro uso com volume de mídia vazio.
- Gestão de contas pela equipe, com listagem e inspeção de usuários, visualização das
  contas e personagens vinculados, alteração de papéis e desvinculação controlada.
- Consulta detalhada de personagens e preços dos serviços de conta e personagem no
  painel do jogador.
- Autenticação por OAuth, proteção hCaptcha no cadastro e suporte a avatar no perfil.
- Inventário por conta e personagem, visualização de equipamentos, seleção de itens,
  regras de negociabilidade e gerenciamento de bolsas usado pelo inventário, jogos e
  checkout.
- Pacotes de carrinho, códigos promocionais e integração das compras com conquistas e
  recompensas de progresso.
- Datas de criação e atualização nos leilões, com informações adicionais na experiência
  de lances e listagem.
- Central de suporte para jogadores e staff, com abertura, resposta, atribuição e
  acompanhamento de chamados.
- Evolução do passe de batalha com missões, trocas e resgate automático de recompensas;
  melhorias no bônus diário, batalhas, pesca e conteúdo dos jogos.
- Observação da economia de itens na central da staff, com categorias, snapshots,
  favoritos, comparação e enriquecimento pelos metadados XML do Lineage.
- API pública de metadados de itens, catálogo customizado administrável e resolução
  compartilhada de nomes, ícones, tipos e regras de troca.
- Pacote de ícones de itens incorporado ao artefato de produção e scripts para importar,
  empacotar e reconstruir o catálogo do frontend.
- Scripts operacionais de instalação, configuração, deploy, backup e restauração,
  incluindo rotação de segredos e detecção do ambiente de produção.
- Stack de produção com Compose, Nginx, frontend estático, health checks e suporte a
  implantação atrás de proxy reverso externo.
- Biblioteca React de botões, campos, cards, cabeçalhos, abas, paginação e estados de
  consulta, com catálogo interativo para desenvolvimento.
- Base visual compartilhada no Django/Jazzmin, página de componentes administrativos e
  assets comuns para botões e ações nativas.
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

### Removido

- Rede social: feed, curtidas, comentários, amizades e chat entre jogadores.
- Módulo de clãs, incluindo perfis, endpoints e telas que ainda dependiam da
  implementação social removida.

### Corrigido

- Resolução dos assets declarados pelo tema instalado, precedência da folha de estilo
  do pacote e conflito entre a navegação global e o chrome do renderer Valorem.
- Responsividade das ações e formulários do shell de autenticação Valorem.
- Sessão por cookies, renovação de autenticação e preservação do estado do usuário
  entre carregamentos e respostas expiradas.
- Autorização de personagem na consulta de inventário e sinal de saídas no extrato.
- Limpeza da seleção ao trocar de conta no inventário e bloqueio de publicação
  duplicada de personagem no marketplace enquanto a requisição está pendente.
- Tratamento de falhas observáveis no marketplace e nos fluxos de conta, perfil,
  carteira, loja, inventário, jogos e suporte.
- Cotação por código de pacote, validação de identificador OAuth, desafios 2FA
  malformados e autenticação de contas desativadas entre as etapas.
- Conversão de transports e tratamento de falhas de verificação de passkeys.
- Consultas SQL do dialeto Dream v3 alinhadas ao schema real do Lineage.
- Caminho do SQLite resolvido corretamente nas configurações locais.
- Preservação do prefixo `/api` e normalização de caminhos ao operar atrás de proxy
  reverso, incluindo a seleção correta do Compose de produção.
- Disponibilidade dos ícones de itens depois do build e do deploy de produção.

### Alterado

- O tema `default` passou a funcionar como fallback interno, imutável e restaurável;
  pacotes e mídias de temas permanecem fora do Git e são persistidos no volume de
  mídia da instalação.
- HTML e comportamentos JavaScript específicos de temas passaram a ser executados por
  componentes React homologados. O ZIP aceita CSS, manifesto e assets locais, mas
  bloqueia HTML/JavaScript arbitrário e referências externas.
- A observação de itens deixou as telas isoladas do Django Admin e passou a integrar a
  central React da staff, preservando ferramentas administrativas especializadas.
- A exibição de personagens, equipamentos e itens negociáveis passou a compartilhar as
  mesmas regras e metadados do catálogo Lineage.
- O painel privado recebeu menu lateral recolhível, navegação reorganizada e comportamento
  responsivo para desktop e celular.
- Formulários de usuários no Django Admin passaram a usar seletores de grupos e permissões
  com busca e transferência; ícones do Jazzmin foram centralizados e os models adotaram a
  base administrativa compartilhada.
- README principal focado na apresentação do produto e nos caminhos de leitura;
  explicações detalhadas e guias centralizados nas pastas de `docs/`.
- Documento de arquitetura ampliado com dependências, DI e fluxo de implementação.
- Classes públicas, serializers, formulários e casos de uso receberam docstrings sobre
  responsabilidade, entrada, retorno e efeitos relevantes.
- Swagger UI e ReDoc com o tema ouro/escuro do frontend e do Jazzmin.
- Licenciamento alterado para termos source-available, permitindo estudo, modificação
  para uso próprio e redistribuição gratuita, sem autorizar comercialização por terceiros.

## [2.0.0] - 2026-08-31

### Adicionado

- Monorepo com backend Django/DRF e frontend React/Vite.
- Autenticação por cookies JWT, perfil, 2FA, progresso e recompensas.
- Integração configurável com bancos Lineage 2 nos módulos Lucera v2 e Dream v3.
- Carteira, loja, pagamentos, inventário, marketplace e leilões.
- Conteúdo, clãs, feed social, amizades, chat e notificações.
- Jogos, bônus diário, caixas, economia e passe de batalha.
- Docker Compose com PostgreSQL, Redis, Gunicorn, Daphne, Celery, Nginx e frontend de desenvolvimento.
