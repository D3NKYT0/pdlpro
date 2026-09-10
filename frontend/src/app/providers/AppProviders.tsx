import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { I18nextProvider } from 'react-i18next'
import { CookieConsentBanner } from '../../components/legal/CookieConsentBanner'
import { TermsReacceptanceGate } from '../../components/legal/TermsReacceptanceGate'
import { AuthProvider } from '../../contexts/AuthContext'
import { CookieConsentProvider } from '../../contexts/CookieConsentContext'
import i18n from '../../i18n'
import { queryClient } from '../../services/infra/queryClient'
import { AppRoutes } from '../routes/AppRoutes'
import { ThemeProvider } from '../../theme/ThemeProvider'

export function AppProviders() {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <CookieConsentProvider>
            <AuthProvider>
              <AppRoutes />
              <CookieConsentBanner />
              <TermsReacceptanceGate />
              <div data-theme-part="toast-host" data-theme-surface="overlay">
                <Toaster position="top-right" containerClassName="pdl-toast" toastOptions={{ className: 'pdl-toast' }} />
              </div>
            </AuthProvider>
          </CookieConsentProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nextProvider>
  )
}
