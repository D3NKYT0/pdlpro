# Documentação do PDL PRO

Guias para instalar, desenvolver, integrar e operar o painel. Cada explicação
tem um documento principal; os READMEs próximos ao código apontam para ele.

**[Projeto](../README.md)** ·
**[Instalar (Release)](operacao/distribuicao.md)** ·
**[Desenvolver](desenvolvimento/ambiente-local.md)** ·
**[Testes](desenvolvimento/testes.md)** ·
**[Melhorar estas docs](projeto/documentacao.md)**

## Qual caminho seguir

| Seu objetivo | Use |
| --- | --- |
| Colocar o painel no ar numa VPS | **[Distribuição / Release](operacao/distribuicao.md)** — instalador + imagens prontas. **Não precisa clonar o Git.** |
| Atualizar, HTTPS, backup, diagnóstico | [Distribuição](operacao/distribuicao.md) → [Backup](operacao/backup-e-restauracao.md) → [Problemas](operacao/solucao-de-problemas.md) |
| Administrar integrações e o jogo | [Configuração](configuracao/ambiente.md) → [Integrações admin](operacao/integracoes-admin.md) → [Lineage](integracoes/lineage.md) |
| Desenvolver ou contribuir | [Ambiente local](desenvolvimento/ambiente-local.md) → [Arquitetura](arquitetura/visao-geral.md) → [Testes](desenvolvimento/testes.md) |
| Frontend / temas | [Frontend](desenvolvimento/frontend.md) → [Temas](funcionalidades/temas.md) → [Componentes](desenvolvimento/componentes.md) |
| Build a partir do clone / topologia especial | [Implantação avançada](operacao/implantacao.md) — apenas quem mantém o código ou publica releases |

> **Distribuição × Implantação.** *Distribuição* é o fluxo recomendado (releases
> públicas). *Implantação avançada* descreve clone Git, build local, checklist
> e topologias alternativas — não substitui o instalador para quem só quer o
> painel rodando.

## Índice completo

### Produto e primeiros passos

| Documento | O que explica |
| --- | --- |
| [Visão geral](produto/visao-geral.md) | Recursos, stack, estrutura e diferenças do PDL 2.0 |
| [Docker de desenvolvimento](primeiros-passos/docker.md) | Clone local com Compose `dev` (não é instalação de produção) |

### Desenvolvimento

| Documento | O que explica |
| --- | --- |
| [Ambiente local](desenvolvimento/ambiente-local.md) | Python, frontend, execução nativa, Docker e migrações |
| [Frontend](desenvolvimento/frontend.md) | Organização, serviços HTTP, sessão, cache, rotas e assets |
| [Componentes e padrão visual](desenvolvimento/componentes.md) | Catálogo local, botões, campos, estados, hooks e composição de novas telas |
| [Interface do admin/backend](desenvolvimento/interface-admin.md) | Jazzmin, login, botões compartilhados, envio nativo e documentação HTTP |
| [Testes e qualidade](desenvolvimento/testes.md) | Pytest, Vitest, isolamento, exemplos, cobertura e limites |
| [Política de testes](desenvolvimento/politica-de-testes.md) | Testes obrigatórios para features e correções, critérios de review e CI |
| [Internacionalização](desenvolvimento/i18n.md) | Idiomas pt/en/es, seletor, namespaces e conteúdo CMS |
| [Preview isolado](desenvolvimento/preview.md) | Dados demonstrativos sem acessar pagamentos ou jogo reais |

### Arquitetura

| Documento | O que explica |
| --- | --- |
| [Visão geral técnica](arquitetura/visao-geral.md) | Camadas, dependências e fluxo de uma mudança |
| [Guia dos apps](arquitetura/apps.md) | Responsabilidades dos módulos e exemplos de casos de uso |
| [Extensões de cliente](arquitetura/extensoes.md) | Overlay `extensions/*`, contrato de imports e updates do core |
| [Componentes compartilhados](arquitetura/common.md) | DI, lifetimes, transações, UUIDs, erros e admin |
| [Reutilização e código repetido](arquitetura/reutilizacao.md) | Políticas compartilhadas, limites das abstrações e auditoria reproduzível |
| [Migração Clean Architecture + DI (PDF)](arquitetura/migracao-clean-architecture-di.pdf) | Registro técnico do que migrámos, decisões e estado validado |
| [Migração frontend em camadas (PDF)](arquitetura/migracao-frontend-camadas.pdf) | Paridade SPA: barrel, serviços, páginas finas e invalidação escopada |

### API e configuração

| Documento | O que explica |
| --- | --- |
| [Guia da API](api/README.md) | Namespaces, sessão, CSRF, paginação e erros |
| [API de relatórios financeiros](api/relatorios-financeiros.md) | Filtros, respostas, unidades e regras de cálculo |
| [API de relatórios operacionais](api/relatorios-operacionais.md) | Inventário, leilões, compras e marketplace (staff) |
| [API do catálogo de itens](api/catalogo-de-itens.md) | Metadados públicos e administração de customs |
| [Variáveis de ambiente](configuracao/ambiente.md) | Settings, origens, bancos, pagamentos, e-mail e push |

### Integrações

| Documento | O que explica |
| --- | --- |
| [Lineage 2](integracoes/lineage.md) | Gateways, dialetos SQL, schema e homologação |
| [TLS no MySQL do Lineage 2](integracoes/lineage-mysql-ssl.md) | Escolha entre TCP simples e TLS, certificados e volume Docker |
| [Catálogo de itens](integracoes/catalogo-de-itens.md) | XML, customs, imagens, cache e permissões |
| [Ícones de itens e skills](integracoes/icones.md) | Importação, pacote de assets e publicação |
| [Câmbio entre painel e jogo](integracoes/cambio-painel-jogo.md) | Recibos, requisitos transacionais e retomada |
| [Pagamentos e webhooks](integracoes/pagamentos.md) | Cotação, gateways, assinatura, liquidação e testes |

### Funcionalidades

| Documento | O que explica |
| --- | --- |
| [Temas instaláveis](funcionalidades/temas.md) | Pacotes ZIP, renderer Valorem, segurança, ativação e restauração do default |
| [Templates públicos clássicos](funcionalidades/templates-publicos.md) | Catálogo de 20 layouts da landing; aliases `portal-v1` / `club-v1` |
| [Coming Soon](funcionalidades/coming-soon.md) | Página de lançamento, countdown do tema e login restrito à staff |
| [Identidade visual da página inicial](funcionalidades/identidade-visual-da-home.md) | Artes próprias, personagem central, mapa de uso e regras de manutenção |
| [Ajuda e Denkynho](funcionalidades/ajuda.md) | Chat sobre o FAQ publicado, personagem animado, limites e atendimento |
| [Documentos legais e LGPD](funcionalidades/documentos-legais-e-lgpd.md) | Termos, privacidade, cookies, histórico de versões e reaceitação |
| [Animações do Denkynho](funcionalidades/denkynho-animacoes.md) | Sequências de comer, jogar e rir, assets, reprodução e prompts |
| [Programas e recompensas](funcionalidades/programas-e-recompensas.md) | Apoiadores, comissões, comércio, passe, caça do dia, lojas do jogo, bônus e pesca |
| [Observação de itens](funcionalidades/observacao-de-itens.md) | Capturas, categorias, favoritos, comparação e acesso |
| [Moderação de personagens](funcionalidades/moderacao.md) | Kick, prisão, banimento e teleporte no admin SPA |

### Operação

| Documento | O que explica |
| --- | --- |
| [Distribuição (recomendado)](operacao/distribuicao.md) | Release: instalar, HTTPS, admin, launcher e atualizar com imagens prontas |
| [Implantação avançada](operacao/implantacao.md) | Clone Git, build local, topologias, checklist e rollback (mantenedores) |
| [Backup e restauração](operacao/backup-e-restauracao.md) | Escopo dos scripts, mídia, segredos e ensaio de recuperação |
| [Rotação de segredos](operacao/rotacao-de-segredos.md) | Soft-rotate, MultiFernet, painel admin e Beat |
| [Configurador admin de integrações](operacao/integracoes-admin.md) | Pagamentos, Lineage, SMTP/VAPID, OAuth, Denkynho, S3/R2 e Sentry com hot-apply |
| [Observabilidade e auditoria](operacao/observabilidade.md) | Logs estruturados, correlação, alertas, auditoria e retenção |
| [Solução de problemas](operacao/solucao-de-problemas.md) | Diagnóstico de ambiente, Nginx, FTP, Redis da install, sessão e disco |
| [Segurança de contas e operações](operacao/seguranca.md) | Sessões, OAuth, proxies e conciliação de serviços pagos |

### Projeto e histórico

| Documento | O que explica |
| --- | --- |
| [Contribuição](projeto/contribuicao.md) | Fluxo de mudança, padrões e evidências de validação |
| [Manutenção da documentação](projeto/documentacao.md) | Organização, padrão de escrita e inclusão de novos guias |
| [Segurança](projeto/seguranca.md) | Relato privado de vulnerabilidades, agradecimentos e práticas operacionais |
| [Uso e licença](projeto/licenca.md) | Resumo das condições e referência ao texto da licença |
| [Validação de 02/09/2026](historico/2026-09-02-validacao.md) | Registro histórico de programas e recompensas; não é garantia de homologação atual |
| [Ampliação dos testes em 02/09/2026](historico/2026-09-02-testes.md) | Cenários adicionados, resultados, cobertura, correções e lacunas restantes |
| [Reutilização em 02/09/2026](historico/2026-09-02-reutilizacao.md) | Biblioteca visual, políticas consolidadas, botões, testes e validação no navegador |
| [Evolução do Denkynho em 04/09/2026](historico/2026-09-04-denkynho-evolucao.md) | Conversa, preferências, ajuda contextual, armário e validação |
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

Ao mudar comportamento, atualize o guia correspondente no mesmo trabalho.
Exemplos e registros datados descrevem o contexto informado; a implementação
e uma nova execução determinam o comportamento do checkout atual.

## Proteções de autenticação e transações

Consulte [Segurança de contas e operações](operacao/seguranca.md) para
migração, revogação de sessões, OAuth, proxies e conciliação de serviços
pagos.
