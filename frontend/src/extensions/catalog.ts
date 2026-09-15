import type { ExtensionModule } from './types'

const discovered = import.meta.glob<{ [exportName: string]: unknown }>('./*/index.tsx', {
  eager: true,
})

function isExtensionModule(value: unknown): value is ExtensionModule {
  if (!value || typeof value !== 'object') return false
  const candidate = value as ExtensionModule
  return typeof candidate.id === 'string' && candidate.id.length > 0 && Array.isArray(candidate.routes)
}

function moduleFromFile(mod: Record<string, unknown>): ExtensionModule | null {
  if (isExtensionModule(mod.default)) return mod.default
  if (isExtensionModule(mod.extension)) return mod.extension
  for (const value of Object.values(mod)) {
    if (isExtensionModule(value)) return value
  }
  return null
}

/**
 * Catálogo descoberto no build: cada pasta `extensions/<id>/index.tsx` que exporta
 * um `ExtensionModule`. Não edite este arquivo por cliente — crie a pasta e ative
 * `VITE_PDL_EXTENSIONS`.
 */
export const EXTENSION_CATALOG: Record<string, ExtensionModule> = {}

for (const mod of Object.values(discovered)) {
  const item = moduleFromFile(mod)
  if (!item) continue
  EXTENSION_CATALOG[item.id] = item
}
