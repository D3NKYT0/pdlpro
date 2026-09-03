# Desenvolvimento do frontend

[Índice](../README.md) · [Ambiente local](ambiente-local.md) · [Testes](testes.md)

A interface é uma SPA React com TypeScript e Vite. Site público, autenticação, jogador e equipe compartilham serviços de API e componentes. As versões e os comandos disponíveis estão em [package.json](../../frontend/package.json).

## Organização

| Caminho em frontend/src/ | Responsabilidade |
| --- | --- |
| `main.tsx`, `App.tsx` | Inicialização da aplicação |
| `app/providers/` | Providers compartilhados |
| `app/routes/` | Rotas e proteções como RequireAuth e RequireStaff |
| `contexts/AuthContext.tsx` | Estado de autenticação |
| `pages/`, `pages/admin/` | Telas públicas, do jogador e administrativas |
| `components/` | Componentes reutilizáveis |
| `components/ui/`, `hooks/` | Biblioteca visual e ciclo compartilhado de ações |
| `services/api.ts` | Exportações de serviços consumidos pelas telas |
| `services/domain/` | Operações organizadas por capacidade do backend |
| `services/infra/` | HTTP, erros e recuperação da sessão |
| `services/types.ts` | Tipos dos contratos de API |
| `lib/` | Helpers de itens, autenticação e outras capacidades |
| `theme/`, `components/themes/` | Provider global, resolução de assets e renderers homologados |
| `styles/`, `public/theme/` | Estilos estruturais e tema default embarcado |

## Executar e compilar

Dentro de `frontend/`:

```bash
npm ci
npm run dev
```

O Vite usa a porta 3000. O proxy encaminha `/api`, `/admin`, `/media` e `/ws` ao backend, com suporte a upgrade WebSocket em `/ws`. O destino padrão local é `http://127.0.0.1:8000`; em Docker, é o serviço `backend`. Para outro ambiente local, configure `PDL_API_TARGET` antes de iniciar o processo; veja [Preview](preview.md).

```bash
npm run test:run
npm run build
```

O build gera `frontend/dist`. `npm run preview` serve esse build para uma conferência local; não substitui a configuração de proxy, TLS e mídia necessária em produção. Os hooks `predev` e `prebuild` restauram o pacote de [ícones](../integracoes/icones.md).

## Adicionar uma funcionalidade

1. Confirme o contrato na [API](../api/README.md) e no serializer do backend.
2. Declare ou ajuste os tipos sem converter valores monetários em números imprecisos.
3. Acrescente a operação ao serviço de domínio e às exportações de `services/api.ts` quando necessário.
4. Consuma o serviço na página, usando TanStack Query para consultas e invalidação após mutações.
5. Registre a rota e a proteção adequada. A proteção visual não substitui a autorização no backend.
6. Trate estados de carregamento, vazio, erro e acesso negado com a [biblioteca de componentes](componentes.md). Consulte também as [regras de reutilização](../arquitetura/reutilizacao.md).
7. Acrescente testes proporcionais ao comportamento e confira a tela no navegador.

## Sessão e HTTP

[http.ts](../../frontend/src/services/infra/http.ts) centraliza credenciais, CSRF, renovação e conversão de erros em `ApiError`. [session.ts](../../frontend/src/services/infra/session.ts) trata restauração de sessão e falhas transitórias. Evite implementar `fetch`, renovação ou retry novamente nas páginas.

Uma falha de rede não é necessariamente logout; um `401` confirmado e um `502` transitório têm tratamentos diferentes. Ao alterar esse comportamento, consulte os testes de ambos os arquivos. Repetir uma escrita exige considerar a idempotência da operação; não reutilize indiscriminadamente a política de repetição de uma consulta.

## Catálogo e apresentação de valores

O catálogo de itens vem do backend. Consuma os metadados e `icon_url` recebidos; não crie outro JSON de nomes, regras de grade ou resolução de ícones no frontend. Um UUID de produto do painel não é o ID inteiro do item Lineage.

Valores monetários e quantidades grandes podem chegar como strings para preservar precisão. Separe a formatação visual do valor enviado à API e mantenha BRL, USD, moedas da carteira e fichas com suas unidades explícitas.

## Personalização e testes visuais

`ThemeProvider` consulta `/api/v1/public/theme/`, aplica `data-pdl-theme` no elemento
`html`, carrega a folha instalada e configura os assets lógicos. O renderer opcional
`portal-v1` troca o chrome público e os shells de autenticação, jogador e administração
por componentes React confiáveis. Novas telas devem continuar usando a biblioteca de UI:
`data-theme-surface` identifica o contexto e `data-theme-part` expõe partes estáveis ao CSS.

Pacotes locais de desenvolvimento ficam em `frontend/theme-packages/`, que é ignorada
pelo Git. Não importe arquivos dessa pasta no bundle: gere o ZIP e instale-o pela tela
administrativa. O tema `default` em `public/theme/default` continua versionado e deve
funcionar integralmente quando nenhum pacote está ativo. Veja o [contrato de temas](../funcionalidades/temas.md).

A suíte atual usa Node e renderização estática em parte dos cenários. Para mudanças visuais, confira desktop e celular, navegação, formulários, modais e estados vazios. Veja [Testes e qualidade](testes.md) para as limitações e exemplos existentes.
