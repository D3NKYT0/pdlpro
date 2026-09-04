# Documentação do PDL PRO

Guias para instalar, desenvolver, integrar e operar o painel. Escolha uma trilha ou consulte o índice por assunto. Cada explicação tem um documento principal; os READMEs próximos ao código apontam para ele.

**[Projeto](../README.md)** · **[Começar](primeiros-passos/docker.md)** · **[Testes](desenvolvimento/testes.md)** · **[Melhorar estas docs](projeto/documentacao.md)**

## Trilhas de leitura

| Seu objetivo | Caminho sugerido |
| --- | --- |
| Conhecer e experimentar | [Produto](produto/visao-geral.md) → [Docker](primeiros-passos/docker.md) → [Preview](desenvolvimento/preview.md) |
| Contribuir com código | [Ambiente](desenvolvimento/ambiente-local.md) → [Arquitetura](arquitetura/visao-geral.md) → [Apps](arquitetura/apps.md) → [Testes](desenvolvimento/testes.md) |
| Trabalhar no frontend | [Frontend](desenvolvimento/frontend.md) → [Temas](funcionalidades/temas.md) → [Componentes](desenvolvimento/componentes.md) → [Testes](desenvolvimento/testes.md) |
| Administrar um servidor | [Configuração](configuracao/ambiente.md) → [Lineage](integracoes/lineage.md) → [Implantação](operacao/implantacao.md) → [Backup](operacao/backup-e-restauracao.md) |

## Índice completo

### Produto e primeiros passos

| Documento | O que explica |
| --- | --- |
| [Visão geral](produto/visao-geral.md) | Recursos, stack, estrutura e diferenças do PDL 2.0 |
| [Início rápido com Docker](primeiros-passos/docker.md) | Instalação local, primeiro administrador e endereços |

### Desenvolvimento

| Documento | O que explica |
| --- | --- |
| [Ambiente local](desenvolvimento/ambiente-local.md) | Python, frontend, execução nativa, Docker e migrações |
| [Frontend](desenvolvimento/frontend.md) | Organização, serviços HTTP, sessão, cache, rotas e assets |
| [Componentes e padrão visual](desenvolvimento/componentes.md) | Catálogo local, botões, campos, estados, hooks e composição de novas telas |
| [Interface do admin/backend](desenvolvimento/interface-admin.md) | Jazzmin, login, botões compartilhados, envio nativo e documentação HTTP |
| [Testes e qualidade](desenvolvimento/testes.md) | Pytest, Vitest, isolamento, exemplos, cobertura e limites |
| [Política de testes](desenvolvimento/politica-de-testes.md) | Testes obrigatórios para features e correções, critérios de review e CI |
| [Preview isolado](desenvolvimento/preview.md) | Dados demonstrativos sem acessar pagamentos ou jogo reais |

### Arquitetura

| Documento | O que explica |
| --- | --- |
| [Visão geral técnica](arquitetura/visao-geral.md) | Camadas, dependências e fluxo de uma mudança |
| [Guia dos apps](arquitetura/apps.md) | Responsabilidades dos módulos e exemplos de casos de uso |
| [Componentes compartilhados](arquitetura/common.md) | DI, lifetimes, transações, UUIDs, erros e admin |
| [Reutilização e código repetido](arquitetura/reutilizacao.md) | Políticas compartilhadas, limites das abstrações e auditoria reproduzível |

### API e configuração

| Documento | O que explica |
| --- | --- |
| [Guia da API](api/README.md) | Namespaces, sessão, CSRF, paginação e erros |
| [API de relatórios financeiros](api/relatorios-financeiros.md) | Filtros, respostas, unidades e regras de cálculo |
| [API do catálogo de itens](api/catalogo-de-itens.md) | Metadados públicos e administração de customs |
| [Variáveis de ambiente](configuracao/ambiente.md) | Settings, origens, bancos, pagamentos, e-mail e push |

### Integrações

| Documento | O que explica |
| --- | --- |
| [Lineage 2](integracoes/lineage.md) | Gateways, dialetos SQL, schema e homologação |
| [Catálogo de itens](integracoes/catalogo-de-itens.md) | XML, customs, imagens, cache e permissões |
| [Ícones de itens](integracoes/icones.md) | Importação, pacote de assets e publicação |
| [Câmbio entre painel e jogo](integracoes/cambio-painel-jogo.md) | Recibos, requisitos transacionais e retomada |
| [Pagamentos e webhooks](integracoes/pagamentos.md) | Cotação, gateways, assinatura, liquidação e testes |

### Funcionalidades

| Documento | O que explica |
| --- | --- |
| [Temas instaláveis](funcionalidades/temas.md) | Pacotes ZIP, renderer Valorem, segurança, ativação e restauração do default |
| [Ajuda e Denkynho](funcionalidades/ajuda.md) | Chat sobre o FAQ publicado, personagem animado, limites e atendimento |
| [Animações do Denkynho](funcionalidades/denkynho-animacoes.md) | Sequências de comer, jogar e rir, assets, reprodução e prompts |
| [Programas e recompensas](funcionalidades/programas-e-recompensas.md) | Apoiadores, comissões, comércio, passe, bônus e pesca |
| [Observação de itens](funcionalidades/observacao-de-itens.md) | Capturas, categorias, favoritos, comparação e acesso |

### Operação

| Documento | O que explica |
| --- | --- |
| [Implantação](operacao/implantacao.md) | Topologias, produção, proxy, atualização e rollback |
| [Backup e restauração](operacao/backup-e-restauracao.md) | Escopo dos scripts, mídia, segredos e ensaio de recuperação |
| [Observabilidade e auditoria](operacao/observabilidade.md) | Logs estruturados, correlação, alertas, auditoria e retenção |
| [Solução de problemas](operacao/solucao-de-problemas.md) | Diagnóstico de ambiente, sessão, assets, disco no Docker e integrações |

### Projeto e histórico

| Documento | O que explica |
| --- | --- |
| [Contribuição](projeto/contribuicao.md) | Fluxo de mudança, padrões e evidências de validação |
| [Manutenção da documentação](projeto/documentacao.md) | Organização, padrão de escrita e inclusão de novos guias |
| [Segurança](projeto/seguranca.md) | Relato privado de vulnerabilidades e práticas operacionais |
| [Uso e licença](projeto/licenca.md) | Resumo das condições e referência ao texto da licença |
| [Validação de 02/09/2026](historico/2026-09-02-validacao.md) | Registro histórico de programas e recompensas; não é garantia de homologação atual |
| [Ampliação dos testes em 02/09/2026](historico/2026-09-02-testes.md) | Cenários adicionados, resultados, cobertura, correções e lacunas restantes |
| [Reutilização em 02/09/2026](historico/2026-09-02-reutilizacao.md) | Biblioteca visual, políticas consolidadas, botões, testes e validação no navegador |
| [Changelog](historico/changelog.md) | Alterações entre versões |
| [Licença completa](../LICENSE) | Texto que rege o uso e a redistribuição |

## Fontes da implementação

| Informação | Fonte |
| --- | --- |
| Versão do produto/API | [version.json](../version.json) |
| Dependências Python | [requirements.txt](../backend/requirements.txt) |
| Scripts e dependências frontend | [package.json](../frontend/package.json) |
| Configuração disponível | [.env.example](../.env.example) e [settings](../backend/core/settings/) |
| Rotas HTTP | [api_urls.py](../backend/core/api_urls.py) e URLs dos apps |
| Rotas WebSocket | [websocket_routing.py](../backend/core/websocket_routing.py) |
| Testes backend | [pytest.ini](../backend/pytest.ini) e [settings de teste](../backend/core/settings/test.py) |
| Testes frontend | [vite.config.ts](../frontend/vite.config.ts) |

Ao mudar comportamento, atualize o guia correspondente no mesmo trabalho. Exemplos e registros datados descrevem o contexto informado; a implementação e uma nova execução determinam o comportamento do checkout atual.
