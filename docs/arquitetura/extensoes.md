# Extensões de cliente (core + overlay)

[← Índice da documentação](../README.md) · [Visão geral](visao-geral.md) · [Apps](apps.md) · [Temas](../funcionalidades/temas.md)

Este guia descreve como manter o **PDL core** atualizável enquanto cada cliente
ganha código exclusivo **fora** de `apps/`, `common/` e `core/`.

Não use fork longo com patches no miolo do painel. O modelo é:

```text
pdl-core (este repositório, versionado)
        │
        │  depende da tag / release
        ▼
instalação do cliente = core + extensions/<cliente> + tema ZIP + env
```

## Pastas

| Caminho | Papel |
| --- | --- |
| `backend/apps/`, `backend/common/`, `backend/core/` | Core do produto — atualiza com o PDL |
| `backend/extensions/` | Overlay de cliente (código novo exclusivo) |
| `backend/extensions/_example/` | Skeleton instalável sob demanda (não entra no `INSTALLED_APPS` padrão) |
| `backend/extensions/surface.py` | Re-exports estáveis (DI, views, erros, paginação, permissões) |
| `backend/extensions/loader.py` | Lê `PDL_EXTENSION_APPS` e monta URLs |
| `frontend/src/extensions/` | Overlay SPA: catálogo + `VITE_PDL_EXTENSIONS` + `/ext/<id>/` |
| pacote de tema ZIP | Marca / CSS / assets (já documentado em [Temas](../funcionalidades/temas.md)) |

Código de cliente **não** deve editar arquivos do core. Se a regra precisar
existir no core, abra uma **porta** genérica e implemente o adaptador na
extensão — ou contribua a feature reutilizável de volta ao produto.

## Ativar uma extensão

1. Crie `backend/extensions/<cliente>/` copiando `_example/` (renomeie o pacote;
   remova o prefixo `_`).
2. Ajuste `AppConfig.name` (`extensions.<cliente>`), `label` (único no projeto) e
   o `ExampleExtensionProvider` → provider do cliente.
3. No `.env` da instalação:

```env
PDL_EXTENSION_APPS=extensions.acme.apps.AcmeConfig
```

Várias extensões: lista separada por vírgula. Só caminhos sob `extensions.*`
são aceitos.

4. Reinicie o backend. Rotas com `presentation/urls.py` sobem em:

```text
/api/v1/extensions/<label>/…
```

Exemplo (`_example` ativado): `GET /api/v1/extensions/example_extension/ping/`.

5. Rode migrações se a extensão tiver models próprios
   (`python manage.py migrate <label>`).

Para experimentar o skeleton no desenvolvimento:

```env
PDL_EXTENSION_APPS=extensions._example.apps.ExampleExtensionConfig
```

## Estrutura de um app de extensão

Espelhe o core (Clean Architecture + DI):

```text
backend/extensions/<cliente>/
  apps.py                 # AppConfig.ready → DependencyInjection.add_provider
  domain/                 # entidades, portas, exceções (sem Django)
  application/            # casos de uso
  infrastructure/         # ORM, providers, gateways do cliente
  presentation/           # serializers, views, urls
  tests/
```

O `AppConfig.ready()` registra o `AppProvider` como nos apps do core. Views
herdam `InjectedAPIView` e resolvem casos de uso com `self.resolve(...)`.

## O que importar (contrato)

### Preferido — superfície estável

```python
from extensions.surface import (
    AppProvider,
    DependencyInjection,
    DomainError,
    InjectedAPIView,
    IsStaffMember,
    Lifetime,
    StandardPagination,
)
```

`extensions.surface` concentra o encanamento transversal. Novos símbolos só
entram com menção no changelog (contrato público).

### Permitido — portas e casos de uso do core

| Importar | Exemplo | Uso |
| --- | --- | --- |
| Portas de domínio | `apps.wallet.domain.repositories.IWalletRepository` | Injetar via DI no construtor do caso de uso da extensão |
| Casos de uso do core | `TransferToPlayerUseCase` | `self.resolve(TransferToPlayerUseCase)` na view ou no seu caso de uso |
| Contratos HTTP | serializers públicos já expostos / OpenAPI | Consumir o mesmo envelope de erro e paginação |
| `common.*` | paginação, permissões, `UnitOfWork` via DI | Capacidades transversais |

### Proibido

| Não faça | Por quê |
| --- | --- |
| `from apps.*.infrastructure…` | Acopla a extensão ao ORM/gateway interno; quebra no refactor |
| Editar `apps/`, `common/`, `core/` no fork do cliente | Conflito em todo update do core |
| `if client == "acme"` no core | Contamina o produto; use extensão ou porta genérica |
| Upload de `.py` pelo admin | Superfície de ataque; extensões são código de deploy |
| Importar outra extensão de cliente | Isolamento por instalação |

Teste automatizado em `backend/extensions/tests/test_surface.py` falha se algum
arquivo sob `extensions/` importar `apps.*.infrastructure`.

## Frontend

Coloque telas exclusivas em `frontend/src/extensions/<cliente>/` e registre o
módulo em `frontend/src/extensions/catalog.ts` (composition root).

Ative com:

```env
VITE_PDL_EXTENSIONS=acme
```

| Peça | Papel |
| --- | --- |
| `types.ts` / `ExtensionModule` | Contrato: `id`, `routes[]` com `scope` |
| `catalog.ts` | Mapa id → módulo conhecido pelo build |
| `registry.ts` | Lê o env, monta paths `/ext/<id>/…` |
| `extensionRouteElements()` | Lista de `<Route>` espalhada em `AppRoutes` |
| `_example/` | Skeleton (`scope: public` → `/ext/example/ping`) |

Escopos:

| `scope` | Onde monta | Proteção |
| --- | --- | --- |
| `public` | `PublicLayout` | anônimo |
| `panel` | `PrivateLayout` | `RequireAuth` |
| `staff` | sob `RequireStaff` | staff |

- Continue importando HTTP de `services/api.ts`.
- Não altere `AppRoutes` por cliente — só o catálogo + env.
- i18n: namespaces próprios ou chaves da instalação; o skeleton usa
  `common.extensionExample.*` só como fumaça do core.
- Visual de marca: prefira [tema ZIP](../funcionalidades/temas.md).

Alinhamento com o backend: SPA `/ext/<id>/…` ↔ API
`/api/v1/extensions/<label>/…` (IDs/labels podem coincidir por convenção).

## Fluxos de repositório

### A — Core público + repo privado do cliente (recomendado)

```text
pdl-pro (tags v2.x)
pdl-client-acme  → depende do core (subtree, submodule, ou imagem Docker
                   com core pinado) e versiona só extensions/acme + tema
```

Update: sobe a tag do core, roda testes do overlay, ajusta só quebras de
contrato.

### B — Fork privado do monólito

Aceitável se a disciplina for rígida: **zero** diff em `apps/` / `common/` /
`core/` além do inevitável (e preferível zero). Todo código novo em
`extensions/` e `frontend/src/extensions/`. Merge do upstream fica barato.

### C — Monorepo interno com vários clientes

```text
backend/extensions/acme/
backend/extensions/beta/
```

Cada deploy define `PDL_EXTENSION_APPS` com um único cliente. Não compartilhe
código entre clientes sem extrair para o core ou para um pacote versionado.

## Checklist de update do core no cliente

1. Ler o [changelog](../historico/changelog.md) desde a tag atual (Adicionado /
   Alterado / Removido / quebras).
2. Fixar a nova tag/imagem do core.
3. `pytest` no backend incluindo `extensions/` do cliente.
4. Testes/build do frontend do overlay.
5. Smoke: login, pagamento (se usado), endpoints
   `/api/v1/extensions/<label>/` e rotas SPA `/ext/<id>/`.
6. Migrar apenas labels das extensões do cliente, se houver models novos no
   core ou na extensão.
7. Só então promover o ambiente.

## Quando a feature deveria ir para o core

- Mais de um cliente precisa da mesma regra.
- Exige mudança profunda em carteira, checkout, inventário ou Lineage.
- Dá para expor uma porta estável (`I…`) sem revelar o cliente.

Aí a implementação genérica entra no core; a extensão só configura ou
implementa o adaptador específico.

## Relação com temas e programs

| Mecanismo | Serve para |
| --- | --- |
| Tema ZIP | Marca, CSS, assets, composição visual |
| Programs / flags | Ligar/desligar capacidades já existentes no core |
| `extensions/*` | Lógica, models, APIs e UI **novas** só daquele cliente |

Os três se somam; nenhum substitui o outro.
