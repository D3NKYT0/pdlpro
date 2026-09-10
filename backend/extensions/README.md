# Extensões de cliente

Área de **overlay** sobre o core PDL. Código exclusivo de instalação fica em
`extensions/<cliente>/` — não edite `apps/`, `common/` ou `core/` para
customizar um cliente.

| Item | Descrição |
| --- | --- |
| Guia completo | [docs/arquitetura/extensoes.md](../../docs/arquitetura/extensoes.md) |
| Superfície de import | [`surface.py`](surface.py) |
| Loader / env | [`loader.py`](loader.py) · `PDL_EXTENSION_APPS` |
| Skeleton | [`_example/`](_example/) |

Ativar o exemplo:

```env
PDL_EXTENSION_APPS=extensions._example.apps.ExampleExtensionConfig
```

Depois: `GET /api/v1/extensions/example_extension/ping/`.
