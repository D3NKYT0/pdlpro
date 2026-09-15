# SQL Lineage na extensão

O core **não** precisa de um PR para o fork do cliente. Coloque o dialeto em:

```text
infrastructure/lineage/queries/<dialeto>/*.sql
```

Ative o app (`PDL_EXTENSION_APPS`) e aponte:

```env
LINEAGE_QUERY_MODULE=<dialeto>
```

## Overlay (recomendado no update do PDL)

Copie só as consultas que diferem do core, **com o mesmo nome de dialeto**
(`lucerav2`, `dreamv3` ou `mobius`). O catálogo carrega o core primeiro e
substitui `-- name:` iguais pelos arquivos da extensão.

```text
infrastructure/lineage/queries/lucerav2/characters.sql   # só o que mudou
infrastructure/lineage/queries/lucerav2/manifest.json    # opcional: {"core_revision": 1}
```

`core_revision` deve igualar `LineageQueryCatalog.CONTRACT_REVISION`. Sem
manifest o overlay carrega; revisão antiga recusa o catálogo na subida.

```env
LINEAGE_QUERY_MODULE=lucerav2
```

Quando o PDL sobe de versão, o restante das queries vem do core. Revalide o
overlay (schema do jogo) antes de promover.

## Dialeto novo (fork inteiro)

Pasta com **todas** as consultas obrigatórias (`LineageQueryCatalog.REQUIRED`).
Não envie SQL pelo admin: é código de deploy, versionado com a extensão.

Se o hash de senha não seguir o nome do módulo (`lucerav2` → Whirlpool,
demais → SHA1):

```env
LINEAGE_PASSWORD_ALGO=whirlpool
```

Contrato das queries: [Integração Lineage](../../../../../docs/integracoes/lineage.md).
