import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '../../contexts/AuthContext'
import { queryClient } from '../../services/infra/queryClient'
import { AppRoutes } from '../routes/AppRoutes'
import { ThemeProvider } from '../../theme/ThemeProvider'

export function AppProviders() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppRoutes />
          <div data-theme-part="toast-host" data-theme-surface="overlay">
            <Toaster position="top-right" containerClassName="pdl-toast" toastOptions={{ className: 'pdl-toast' }} />
          </div>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
