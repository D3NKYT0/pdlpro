# Extensões de frontend (cliente)

UI exclusiva da instalação. Espelha `backend/extensions/`: o core da SPA
permanece em `pages/`, `components/` e `services/`; o cliente adiciona módulos
aqui e os ativa por env.

Guia: [Extensões de cliente](../../../docs/arquitetura/extensoes.md).

## Ativar

1. Crie `frontend/src/extensions/<cliente>/` (copie `_example/`).
2. Exporte um `ExtensionModule` e registre em [`catalog.ts`](catalog.ts).
3. No `.env` do frontend:

```env
VITE_PDL_EXTENSIONS=example
```

Rotas sobem em `/ext/<id>/…` nos escopos `public` | `panel` | `staff`
(montados em [`AppRoutes`](../app/routes/AppRoutes.tsx) via
`extensionRouteElements` — **não** edite o router do core para cada cliente).

Exemplo: `GET /ext/example/ping` com `VITE_PDL_EXTENSIONS=example`.

## Regras

- HTTP só via `services/api.ts`.
- i18n nos três idiomas (ou namespace local da instalação).
- Marca: tema ZIP, não CSS paralelo ao design system.
