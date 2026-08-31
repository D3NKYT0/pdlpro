import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '../../contexts/AuthContext'
import { queryClient } from '../../services/infra/queryClient'
import { AppRoutes } from '../routes/AppRoutes'

export function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  )
}
