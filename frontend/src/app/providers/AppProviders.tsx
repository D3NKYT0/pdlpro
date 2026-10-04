import { ImpersonationBanner } from '../../components/auth/ImpersonationBanner'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { I18nextProvider } from 'react-i18next'
import { AuthProvider } from '../../contexts/AuthContext'
import { ActiveAccountProvider } from '../../contexts/ActiveAccountContext'
import { CookieConsentProvider } from '../../contexts/CookieConsentContext'
import { ConsentEnforcementBridge } from '../../components/legal/ConsentEnforcementBridge'
import i18n from '../../i18n'
import { queryClient } from '../../services/infra/queryClient'
import { AppRoutes } from '../routes/AppRoutes'
import { SiteMetadataSync } from '../../theme/SiteMetadataSync'
import { ThemeProvider } from '../../theme/ThemeProvider'
import { ResourceControlsProvider } from '../../contexts/ResourceControlsContext'

export function AppProviders() {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ResourceControlsProvider>
            <SiteMetadataSync />
            <CookieConsentProvider>
              <ConsentEnforcementBridge />
              <AuthProvider>
                <ActiveAccountProvider>
                  <AppRoutes />
                  <ImpersonationBanner />
                  <div data-theme-part="toast-host" data-theme-surface="overlay">
                    <Toaster position="top-right" containerClassName="pdl-toast" toastOptions={{ className: 'pdl-toast' }} />
                  </div>
                </ActiveAccountProvider>
              </AuthProvider>
            </CookieConsentProvider>
          </ResourceControlsProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nextProvider>
  )
}
