import type { ExtensionModule } from '../types'
import { ExampleDashboardSlot } from './ExampleDashboardSlot'
import { ExamplePingPage } from './ExamplePingPage'

export const exampleExtension: ExtensionModule = {
  id: 'example',
  routes: [
    {
      path: 'ping',
      scope: 'public',
      element: <ExamplePingPage />,
      resource: 'ext.example.ping',
    },
  ],
  nav: [
    {
      path: 'ping',
      scope: 'public',
      labelKey: 'nav.ping',
      resource: 'ext.example.ping',
    },
  ],
  slots: [
    {
      slot: 'panel.dashboard',
      element: <ExampleDashboardSlot />,
      resource: 'ext.example.ping',
    },
  ],
}

export { ExamplePingPage }
