import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePanelTheme } from '../src/theme/usePanelTheme'
import { SupportersPage } from '../src/pages/SupportersPage'
import '../src/i18n'
import '../src/styles/global.css'

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
})

client.setQueryData(['resources'], [])
client.setQueryData(['supporter'], {
  profile: null,
  available: '0.00',
  coupons: [],
  commissions: [],
  payouts: [],
})

function Preview() {
  usePanelTheme()
  return (
    <div data-theme-surface="panel">
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: 24 }}>
        <SupportersPage />
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={client}>
    <BrowserRouter>
      <Preview />
    </BrowserRouter>
  </QueryClientProvider>,
)
