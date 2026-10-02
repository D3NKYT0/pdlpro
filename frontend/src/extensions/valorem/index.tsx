import type { ExtensionModule } from '../types'
import { ValoremWikiRouter } from './wiki/ValoremWikiRouter'

export const valoremExtension: ExtensionModule = {
  id: 'valorem',
  routes: [],
  overrides: {
    wiki: <ValoremWikiRouter />,
  },
}

export default valoremExtension
