import type { ExtensionModule } from './types'
import { exampleExtension } from './_example'

/**
 * Catálogo embutido de extensões conhecidas pelo build.
 *
 * No core só o skeleton `example` existe. Em instalação/fork de cliente,
 * importe o módulo e registre aqui (composition root) — não altere AppRoutes.
 */
export const EXTENSION_CATALOG: Record<string, ExtensionModule> = {
  example: exampleExtension,
}
