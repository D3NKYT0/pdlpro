# Documentação do PDL PRO

[Fonte única](projeto/fonte-unica.md)

> **Atualizado:** 25 de setembro de 2026

> [!IMPORTANT]
> **Produção = Release.** Instale com
> [Distribuição](operacao/distribuicao.md). Não clone o Git só para operar o
> painel.

> [!TIP]
> Cada assunto tem **um documento canônico**. Se for segurança, abra
> [Segurança](projeto/fonte-unica.md#segurança). Evite copiar o mesmo checklist
> em vários guias — use links.

**Atalhos:** [Instalar](operacao/distribuicao.md) ·
[Tutoriais](tutoriais/README.md) ·
[Fonte única](projeto/fonte-unica.md) ·
[Desenvolver](desenvolvimento/ambiente-local.md) ·
[Changelog](historico/changelog.md)

---

## Por onde começar

| Quero… | Abrir |
| --- | --- |
| Colocar o painel no ar | [Distribuição (Release)](operacao/distribuicao.md) |
| DNS, OAuth, pagamentos, LLM… | [Tutoriais](tutoriais/README.md) |
| Entender o produto | [Visão geral](produto/visao-geral.md) |
| Desenvolver / contribuir | [Ambiente local](desenvolvimento/ambiente-local.md) → [Arquitetura](arquitetura/visao-geral.md) |
| Reportar vulnerabilidade | [Política de segurança](projeto/seguranca.md) |
| Variável de ambiente | [Configuração](configuracao/ambiente.md) |

> [!NOTE]
> **Distribuição** = instalador + imagens GHCR (recomendado).  
> **Implantação avançada** = clone/build para mantenedores
> ([guia](operacao/implantacao.md)).

---

## Índice

### Produto

| Documento | Conteúdo |
| --- | --- |
| [Visão geral](produto/visao-geral.md) | Recursos, stack, estrutura |
| [Docker de desenvolvimento](primeiros-passos/docker.md) | Compose `dev` no PC (não é produção) |

### Operação

| Documento | Conteúdo |
| --- | --- |
| [Distribuição](operacao/distribuicao.md) | Instalar, HTTPS, admin, atualizar |
| [Tutoriais de integração](tutoriais/README.md) | Passo a passo por provedor |
| [Configurador admin](operacao/integracoes-admin.md) | Hot-apply, abas, API staff |
| [Backup e restauração](operacao/backup-e-restauracao.md) | Dump PostgreSQL e recuperação |
| [Rotação de segredos](operacao/rotacao-de-segredos.md) | Soft-rotate, Fernet, Beat |
| [Segurança operacional](operacao/seguranca.md) | Sessões, proxies, pagamentos |
| [Observabilidade](operacao/observabilidade.md) | Logs, Sentry, auditoria |
| [Solução de problemas](operacao/solucao-de-problemas.md) | Sintomas e correções |
| [Implantação avançada](operacao/implantacao.md) | Clone Git, topologias, checklist |

### Configuração e integrações técnicas

| Documento | Conteúdo |
| --- | --- |
| [Variáveis de ambiente](configuracao/ambiente.md) | Mapa completo de settings |
| [Lineage 2](integracoes/lineage.md) | Dialetos SQL e gateways |
| [TLS MySQL L2](integracoes/lineage-mysql-ssl.md) | Certificados e volume Docker |
| [Pagamentos](integracoes/pagamentos.md) | Fluxo interno MP/Stripe |
| [Catálogo de itens](integracoes/catalogo-de-itens.md) | XML, customs, cache |
| [Ícones](integracoes/icones.md) | Pacote de assets |
| [Câmbio painel ↔ jogo](integracoes/cambio-painel-jogo.md) | Inventário e recibos |

### Funcionalidades

| Documento | Conteúdo |
| --- | --- |
| [Economia do jogador](funcionalidades/economia-jogador.md) | Carteira, loja, marketplace, leilão |
| [Programas e recompensas](funcionalidades/programas-e-recompensas.md) | Passe, pesca, caixas, apoiadores |
| [Temas](funcionalidades/temas.md) | ZIP, Valorem, default |
| [Templates públicos](funcionalidades/templates-publicos.md) | Layouts da landing |
| [Coming Soon](funcionalidades/coming-soon.md) | Countdown e acesso staff |
| [Ajuda / Denkynho](funcionalidades/ajuda.md) | FAQ, LLM, mascote |
| [Animações Denkynho](funcionalidades/denkynho-animacoes.md) | Assets e sequências |
| [Identidade da home](funcionalidades/identidade-visual-da-home.md) | Artes e mapa de uso |
| [Legais e LGPD](funcionalidades/documentos-legais-e-lgpd.md) | Termos, cookies, portabilidade |
| [Observação de itens](funcionalidades/observacao-de-itens.md) | Snapshots staff |
| [Moderação](funcionalidades/moderacao.md) | Kick, ban, teleporte |

### Desenvolvimento

| Documento | Conteúdo |
| --- | --- |
| [Ambiente local](desenvolvimento/ambiente-local.md) | Python, Node, Docker, migrações |
| [Frontend](desenvolvimento/frontend.md) | Camadas SPA, `api.ts`, Query |
| [Componentes](desenvolvimento/componentes.md) | Catálogo UI e composição |
| [Interface admin](desenvolvimento/interface-admin.md) | Jazzmin e botões |
| [Testes](desenvolvimento/testes.md) | Pytest, Vitest, cobertura |
| [Política de testes](desenvolvimento/politica-de-testes.md) | Obrigatório por mudança |
| [i18n](desenvolvimento/i18n.md) | pt / en / es |
| [Preview](desenvolvimento/preview.md) | Dados demo isolados |

### Arquitetura

| Documento | Conteúdo |
| --- | --- |
| [Visão técnica](arquitetura/visao-geral.md) | Camadas e fluxo de mudança |
| [Apps](arquitetura/apps.md) | Responsabilidades dos módulos |
| [Extensões](arquitetura/extensoes.md) | Overlay de cliente |
| [Common](arquitetura/common.md) | DI, UoW, erros, admin |
| [Reutilização](arquitetura/reutilizacao.md) | Políticas e auditoria visual |

### API

| Documento | Conteúdo |
| --- | --- |
| [Guia da API](api/README.md) | Namespaces, CSRF, erros |
| [Relatórios financeiros](api/relatorios-financeiros.md) | Staff financeiro |
| [Relatórios operacionais](api/relatorios-operacionais.md) | Inventário, leilões, loja |
| [Catálogo (API)](api/catalogo-de-itens.md) | Metadados e customs |

### Projeto

| Documento | Conteúdo |
| --- | --- |
| [Fonte única](projeto/fonte-unica.md) | Onde cada assunto vive |
| [Manutenção das docs](projeto/documentacao.md) | Como escrever e organizar |
| [Contribuição](projeto/contribuicao.md) | Fluxo de PR |
| [Política de segurança](projeto/seguranca.md) | Relato de vulnerabilidade |
| [Licença](projeto/licenca.md) | Uso e restrições |
| [Changelog](historico/changelog.md) | Versões |
| [Histórico datado](historico/README.md) | Registros de validação (arquivo) |

---

## Fontes no código

| Informação | Arquivo |
| --- | --- |
| Versão | [version.json](../version.json) |
| Python | [requirements.txt](../backend/requirements.txt) |
| Frontend | [package.json](../frontend/package.json) |
| Env de exemplo | [.env.example](../.env.example) |
| Settings | [backend/core/settings/](../backend/core/settings/) |
| Rotas HTTP | [api_urls.py](../backend/core/api_urls.py) |

> [!CAUTION]
> A documentação descreve o comportamento do código. Se divergir, o código e os
> testes vencem — atualize o guia no mesmo trabalho.
