type LocaleCode = 'pt' | 'en' | 'es'
type LocaleBundles = Record<LocaleCode, Record<string, Record<string, unknown>>>

const files = import.meta.glob('./*/locales/{pt,en,es}.json', {
  eager: true,
  import: 'default',
}) as Record<string, Record<string, unknown>>

const PATH_RE = /^\.\/([^/]+)\/locales\/(pt|en|es)\.json$/

/** Pasta `_example` publica o namespace `ext.example`. */
export function folderToExtensionNamespace(folder: string): string {
  return `ext.${folder.replace(/^_/, '')}`
}

export function extensionI18nResources(
  localeFiles: Record<string, Record<string, unknown>> = files,
): LocaleBundles {
  const resources: LocaleBundles = { pt: {}, en: {}, es: {} }
  for (const [path, bundle] of Object.entries(localeFiles)) {
    const match = path.match(PATH_RE)
    if (!match || !bundle) continue
    const ns = folderToExtensionNamespace(match[1])
    resources[match[2] as LocaleCode][ns] = bundle
  }
  return resources
}

export function extensionNamespaceList(resources: LocaleBundles = extensionI18nResources()): string[] {
  const names = new Set<string>()
  for (const language of Object.values(resources)) {
    for (const ns of Object.keys(language)) names.add(ns)
  }
  return [...names].sort()
}
