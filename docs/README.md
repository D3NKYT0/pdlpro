# Documentação do PDL PRO

Este diretório concentra a documentação técnica e operacional do projeto.

| Documento | Conteúdo |
|---|---|
| [Desenvolvimento](development.md) | Instalação, execução local, testes e comandos frequentes |
| [Configuração](configuration.md) | Variáveis de ambiente e integrações externas |
| [API](api.md) | Namespaces, autenticação, paginação e erros |
| [Arquitetura](architecture.md) | Camadas, dependências, DI, módulos e fluxo de mudança |
| [Implantação](deployment.md) | Limites do Compose atual e checklist de produção |

Documentos na raiz:

- [README do projeto](../README.md)
- [Guia de contribuição](../CONTRIBUTING.md)
- [Política de segurança](../SECURITY.md)
- [Changelog](../CHANGELOG.md)
- [Licença](../LICENSE)

## Fonte da verdade

- Versão do produto e da API: `version.json`.
- Dependências Python: `backend/requirements.txt`.
- Dependências e scripts do frontend: `frontend/package.json`.
- Rotas HTTP: `backend/core/api_urls.py` e arquivos `presentation/urls/`.
- Rotas WebSocket: `backend/core/websocket_routing.py`.
- Configuração: `backend/core/settings/` e `.env.example`.
- Itens L2 (ID, nome, metadados e resolução de ícones): catálogo XML do backend
  (`LINEAGE_ITEM_XML_DIR`), publicado em `/api/v1/public/items/catalog/`.
  Nenhum catálogo independente é mantido no frontend.

Ao alterar um comportamento público, atualize o documento correspondente no mesmo pull request.
