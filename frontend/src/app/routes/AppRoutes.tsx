import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PrivateLayout } from '../../components/layout/PrivateLayout'
import { PublicContent, PublicLayout } from '../../components/layout/PublicLayout'
import { AccountsPage } from '../../pages/AccountsPage'
import { AuctionPage } from '../../pages/AuctionPage'
import { CalendarPage } from '../../pages/CalendarPage'
import { ClansPage } from '../../pages/ClansPage'
import { DownloadsPage } from '../../pages/DownloadsPage'
import { FaqPage } from '../../pages/FaqPage'
import { ForgotPasswordPage } from '../../pages/ForgotPasswordPage'
import { GamesPage } from '../../pages/GamesPage'
import { HomePage } from '../../pages/HomePage'
import { InventoryPage } from '../../pages/InventoryPage'
import { LegalPage } from '../../pages/LegalPage'
import { LoginPage } from '../../pages/LoginPage'
import { MarketplacePage } from '../../pages/MarketplacePage'
import { NewsDetailPage } from '../../pages/NewsDetailPage'
import { NewsPage } from '../../pages/NewsPage'
import { NotificationsPage } from '../../pages/NotificationsPage'
import { PainelPage } from '../../pages/PainelPage'
import { ProgressPage } from '../../pages/ProgressPage'
import { RankingsPage } from '../../pages/RankingsPage'
import { RegisterPage } from '../../pages/RegisterPage'
import { ResetPasswordPage } from '../../pages/ResetPasswordPage'
import { ShopPage } from '../../pages/ShopPage'
import { VerifyEmailPage } from '../../pages/VerifyEmailPage'
import { WalletPage } from '../../pages/WalletPage'
import { InfoPage } from '../../pages/InfoPage'
import { WikiDetailPage } from '../../pages/WikiDetailPage'
import { WikiPage } from '../../pages/WikiPage'
import { LEGACY_PANEL_REDIRECTS } from './legacyRedirects'
import { RequireAuth } from './RequireAuth'

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route element={<PublicContent />}>
            <Route path="/rankings" element={<RankingsPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/news/:slug" element={<NewsDetailPage />} />
            <Route path="/informacoes" element={<InfoPage />} />
            <Route path="/wiki" element={<WikiPage />} />
            <Route path="/wiki/:slug" element={<WikiDetailPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/downloads" element={<DownloadsPage />} />
            <Route path="/terms" element={<LegalPage />} />
            <Route path="/privacy" element={<LegalPage />} />
            <Route path="/agreement" element={<LegalPage />} />
          </Route>
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<PrivateLayout />}>
            <Route path="/painel" element={<PainelPage />} />
            <Route path="/painel/wallet" element={<WalletPage />} />
            <Route path="/painel/accounts" element={<AccountsPage />} />
            <Route path="/painel/inventory" element={<InventoryPage />} />
            <Route path="/painel/games" element={<GamesPage />} />
            <Route path="/painel/progress" element={<ProgressPage />} />
            <Route path="/painel/notifications" element={<NotificationsPage />} />
            <Route path="/painel/shop" element={<ShopPage />} />
            <Route path="/painel/marketplace" element={<MarketplacePage />} />
            <Route path="/painel/auctions" element={<AuctionPage />} />
            <Route path="/painel/clans" element={<ClansPage />} />
          </Route>
        </Route>

        {LEGACY_PANEL_REDIRECTS.map((item) => (
          <Route key={item.from} path={item.from} element={<Navigate to={item.to} replace />} />
        ))}
      </Routes>
    </BrowserRouter>
  )
}
