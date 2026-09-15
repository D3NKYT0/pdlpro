/**
 * APIs HTTP das extensões. Cada pasta pode exportar `api` (ou default) em `api.ts`.
 * Telas importam via `extensionApi('acme')` de `services/api.ts`.
 */

type ApiModule = { api?: unknown; default?: unknown }

const discovered = import.meta.glob<ApiModule>('./*/api.ts', { eager: true })

const PATH_RE = /^\.\/([^/]+)\/api\.ts$/

function folderToId(folder: string): string {
  return folder.replace(/^_/, '')
}

function pickApi(mod: ApiModule): unknown {
  if (mod.api !== undefined) return mod.api
  if (mod.default !== undefined) return mod.default
  return undefined
}

const APIS: Record<string, unknown> = {}
for (const [path, mod] of Object.entries(discovered)) {
  const match = path.match(PATH_RE)
  if (!match) continue
  const api = pickApi(mod)
  if (api !== undefined) APIS[folderToId(match[1])] = api
}

export function extensionApi<T = unknown>(id: string): T | undefined {
  return APIS[id] as T | undefined
}

export function listExtensionApiIds(): string[] {
  return Object.keys(APIS).sort()
}
