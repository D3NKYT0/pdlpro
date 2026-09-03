# Visão geral do PDL PRO

[← Índice da documentação](../README.md)

Painel web completo para comunidades e servidores de **Lineage 2**.

O PDL reúne site público, área do jogador e central operacional da staff em uma
única aplicação. Contas do jogo, personagens, carteira, loja, inventário,
marketplace, leilões, pagamentos, conteúdo e acompanhamento da economia compartilham
as mesmas regras e fontes de dados.

O código é publicamente acessível sob uma licença **source-available**: pode ser
estudado, instalado, modificado para uso próprio e utilizado em servidores de
Lineage 2, mas não pode ser comercializado por terceiros. Consulte o [resumo de uso e licença](../projeto/licenca.md).

> [!WARNING]
> O PDL 2.0 está em desenvolvimento ativo. Antes de usar em produção, revise as
> configurações, prepare o banco do jogo, configure provedores reais e execute o
> checklist de implantação.

## O que mudou no PDL 2.0

O PDL 2.0 não é apenas uma atualização visual do PDL 1.x. A aplicação foi
reestruturada para separar completamente frontend e backend:

- **Backend:** Django 6 e Django REST Framework, com API versionada em `/api/v1/`.
- **Frontend:** React 19, TypeScript e Vite.
- **Site público, jogador e staff:** uma única aplicação React consumindo a mesma API.
- **Banco do painel:** PostgreSQL em produção, separado do MySQL do Lineage 2.
- **Integração com forks:** catálogos de consultas independentes para cada schema.

Essa separação permite manter toda a stack em uma VPS ou publicar o frontend estático
em cPanel, CDN ou outro serviço, deixando o backend em infraestrutura separada. No
segundo cenário, o servidor web precisa encaminhar as rotas de API, WebSocket e mídia
para o backend.

O PDL 2.0 possui um sistema próprio de temas globais instaláveis por ZIP. Um renderer
homologado controla estruturas e comportamentos React; o pacote fornece manifesto, CSS
e assets locais. A cobertura inclui área pública, autenticação, painel do jogador e
central da staff. O tema `default` é interno e imutável, enquanto o Valorem demonstra a
portabilidade visual do `PDL/SITE`. Consulte [Temas instaláveis](../funcionalidades/temas.md).

Não há migração automática do PDL 1.x. Uma mudança para o 2.0 deve ser tratada como
uma nova implantação e testada em paralelo antes da liberação aos jogadores.

## Recursos

### Conta e segurança

- Cadastro, login, recuperação de senha e verificação de e-mail.
- Autenticação por cookies JWT com proteção CSRF.
- 2FA e passkeys.
- Conta mestra vinculada a um ou mais logins do Lineage 2.
- Notificações no painel e Web Push.

### Jogador e servidor

- Personagens, equipamentos, inventário e rankings.
- Status do Login Server e Game Server.
- Carteira, bônus e troca segura entre painel e jogo.
- Recibos e retomada de operações interrompidas para evitar duplicidades.
- Catálogo unificado de itens XML e itens customizados.
- Loja, carrinho, pacotes, cupons e histórico de pedidos.
- Marketplace de personagens e leilões.
- Notícias, wiki, calendário, FAQ, downloads e documentos legais.

### Programas e entretenimento

- Bônus diário e temporadas.
- Passe de batalha com missões, marcos, trocas e recompensas.
- Pesca, caixas, roleta, dados, slots e outros minigames.
- Programa de apoiadores, cupons e comissões.

### Staff e operação

- Central operacional dentro do próprio painel.
- Gestão de loja, rates, notícias, cupons, recompensas e módulos.
- Cadastro de itens customizados sem rebuild do frontend.
- Chamados de suporte com fila e histórico.
- Relatórios de saldo, fluxo, pedidos, pagamentos e reconciliação.
- Observação de itens e snapshots da economia do servidor.
- Django Admin com Jazzmin para manutenção e operações específicas.
- OpenAPI com Swagger UI e ReDoc.
- Instalação, ativação e restauração de temas globais sem rebuild do frontend.

Os módulos compatíveis podem ser desativados sem apagar seus dados. Ao desligar um
recurso, suas rotas são bloqueadas e as telas correspondentes deixam de aparecer para
o jogador.

## Arquitetura

```text
Navegador
   │
   ▼
React + TypeScript
   │  HTTP / WebSocket
   ▼
Django REST Framework ─────► PostgreSQL
   │             │
   │             └─────────► Redis + Celery + Channels
   │
   └───────────────────────► MySQL do Lineage 2 (opcional)
```

O frontend não consulta o banco do jogo diretamente. Todas as regras, permissões e
integrações passam pela API. O backend é organizado em camadas de domínio, aplicação,
infraestrutura e apresentação, com casos de uso e injeção de dependência explícita.

### Stack

| Área | Tecnologias |
|---|---|
| Backend | Python 3.14, Django 6 e Django REST Framework |
| Frontend | React 19, TypeScript 6, Vite 8 e TanStack Query |
| Dados do painel | PostgreSQL 18; SQLite no desenvolvimento nativo |
| Banco do jogo | MySQL, habilitado opcionalmente |
| Processamento | Redis, Celery, Django Channels e Daphne |
| Produção | Docker Compose, Gunicorn e Nginx |
| Qualidade | Pytest, Ruff, Vitest e build TypeScript |

## Estrutura do repositório

```text
.
├── backend/
│   ├── apps/            # Módulos e regras de negócio
│   ├── common/          # DI, contratos, middleware e utilitários
│   ├── core/            # Settings, URLs, ASGI e composição
│   └── data/items/      # Catálogo XML de itens
├── frontend/            # SPA React + TypeScript
├── docs/                # Documentação técnica e operacional
├── nginx/               # Proxy HTTP e WebSocket
├── scripts/             # Instalação, deploy, backup e restauração
├── docker-compose.yml   # Desenvolvimento e integração
├── docker-compose.prod.yml
├── setup.sh
└── version.json         # Versões do produto e da API
```
