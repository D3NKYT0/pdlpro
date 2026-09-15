import type { ExtensionModule } from '../types'
import { ExamplePingPage } from './ExamplePingPage'

export const exampleExtension: ExtensionModule = {
  id: 'example',
  routes: [
    {
      path: 'ping',
      scope: 'public',
      element: <ExamplePingPage />,
    },
  ],
  nav: [
    {
      path: 'ping',
      scope: 'public',
      labelKey: 'nav.ping',
    },
  ],
}

export { ExamplePingPage }
