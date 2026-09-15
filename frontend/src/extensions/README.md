# Extensões de frontend (cliente)

UI exclusiva da instalação. Espelha `backend/extensions/`: o core da SPA
permanece em `pages/`, `components/` e `services/`; o cliente adiciona um
módulo aqui e o ativa por env. O build descobre `*/index.tsx` sozinho.

Guia: [Extensões de cliente](../../../docs/arquitetura/extensoes.md).

## Ativar

1. Crie `frontend/src/extensions/<cliente>/` (copie `_example/`).
2. Exporte um `ExtensionModule` em `index.tsx` (`id` = nome da pasta).
3. Textos em `locales/{pt,en,es}.json` (namespace `ext.<id>`).
4. No `.env` do frontend:

```env
VITE_PDL_EXTENSIONS=example
```

Rotas sobem em `/ext/<id>/…` nos escopos `public` | `panel` | `staff`.
Itens `nav` entram no menu correspondente. **Não** edite o router do core.

Exemplo: `GET /ext/example/ping` com `VITE_PDL_EXTENSIONS=example`.

## Regras

- HTTP só via `services/api.ts`.
- i18n nos três idiomas na pasta da extensão (ou namespace local).
- Marca: tema ZIP, não CSS paralelo ao design system.
