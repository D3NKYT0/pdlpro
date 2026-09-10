import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { GlobalLoadingOverlay } from '../../components/layout/GlobalLoadingOverlay'
import { PrivateLayout } from '../../components/layout/PrivateLayout'
import { PublicContent, PublicLayout } from '../../components/layout/PublicLayout'
import { AccountsPage } from '../../pages/AccountsPage'
import { AccountSecurityPage } from '../../pages/AccountSecurityPage'
import { AuctionPage } from '../../pages/AuctionPage'
import { CalendarPage } from '../../pages/CalendarPage'
import { CharacterPage } from '../../pages/CharacterPage'
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
import { OAuthCallbackPage } from '../../pages/OAuthCallbackPage'
import { PainelPage } from '../../pages/PainelPage'
import { ProfilePage } from '../../pages/ProfilePage'
import { ProgressPage } from '../../pages/ProgressPage'
import { RankingsPage } from '../../pages/RankingsPage'
import { RegisterPage } from '../../pages/RegisterPage'
import { CompleteAccountPage } from '../../pages/CompleteAccountPage'
import { ResetPasswordPage } from '../../pages/ResetPasswordPage'
import { ShopPage } from '../../pages/ShopPage'
import { SupportPage } from '../../pages/SupportPage'
import { HelpPage } from '../../pages/HelpPage'
import { VerifyEmailPage } from '../../pages/VerifyEmailPage'
import { WalletPage } from '../../pages/WalletPage'
import { WalletOrdersPage } from '../../pages/WalletOrdersPage'
import { WalletTransactionsPage } from '../../pages/WalletTransactionsPage'
import { InfoPage } from '../../pages/InfoPage'
import { WikiDetailPage } from '../../pages/WikiDetailPage'
import { WikiPage } from '../../pages/WikiPage'
import {
  LEGACY_EXACT_REDIRECTS,
  LegacyAccountDetailRedirect,
  LegacyFinancialRedirect,
  LegacyReportsRedirect,
} from './legacyRedirects'
import { AdminAccountsPage } from '../../pages/admin/AdminAccountsPage'
import { AdminCoinsPage } from '../../pages/admin/AdminCoinsPage'
import { AdminReportsPage, AdminFinancialReportsRedirect } from '../../pages/admin/AdminReportsPage'
import { AdminGamesPage } from '../../pages/admin/AdminGamesPage'
import { AdminHubPage } from '../../pages/admin/AdminHubPage'
import { AdminItemObservationPage } from '../../pages/admin/AdminItemObservationPage'
import { AdminCustomItemsPage } from '../../pages/admin/AdminCustomItemsPage'
import { AdminNewsPage } from '../../pages/admin/AdminNewsPage'
import { AdminServerPage } from '../../pages/admin/AdminServerPage'
import { AdminServicesPage } from '../../pages/admin/AdminServicesPage'
import { AdminShopPage } from '../../pages/admin/AdminShopPage'
import { AdminSupportPage } from '../../pages/admin/AdminSupportPage'
import { RequireAuth } from './RequireAuth'
import { RequireStaff } from './RequireStaff'
import { ResourceGate } from '../../components/programs/ResourceGate'
import { SupportersPage } from '../../pages/SupportersPage'
import { RoadmapPage, RoadmapDetailPage } from '../../pages/RoadmapPage'
import { RewardsPage } from '../../pages/RewardsPage'
import { GameExchangePage } from '../../pages/GameExchangePage'
import { AdminResourcesPage, AdminRoadmapPage, AdminSupportersPage } from '../../pages/admin/AdminProgramsPage'
import { AdminCommercePage } from '../../pages/admin/AdminCommercePage'
import { AdminGameContentPage } from '../../pages/admin/AdminGameContentPage'
import { AdminThemesPage } from '../../pages/admin/AdminThemesPage'
import { AdminWalletPage } from '../../pages/admin/AdminWalletPage'

export function AppRoutes() {
  return (
    <BrowserRouter>
      <GlobalLoadingOverlay />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/complete-account" element={<CompleteAccountPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
          <Route element={<PublicContent />}>
            <Route path="/roadmap" element={<ResourceGate code="roadmap"><RoadmapPage /></ResourceGate>} />
            <Route path="/roadmap/:id" element={<ResourceGate code="roadmap"><RoadmapDetailPage /></ResourceGate>} />
            <Route path="/rankings" element={<ResourceGate code="rankings"><RankingsPage /></ResourceGate>} />
            <Route path="/news" element={<ResourceGate code="news"><NewsPage /></ResourceGate>} />
            <Route path="/news/:slug" element={<ResourceGate code="news"><NewsDetailPage /></ResourceGate>} />
            <Route path="/info" element={<InfoPage />} />
            <Route path="/wiki" element={<ResourceGate code="wiki"><WikiPage /></ResourceGate>} />
            <Route path="/wiki/:slug" element={<ResourceGate code="wiki"><WikiDetailPage /></ResourceGate>} />
            <Route path="/calendar" element={<ResourceGate code="calendar"><CalendarPage /></ResourceGate>} />
            <Route path="/faq" element={<ResourceGate code="faq"><FaqPage /></ResourceGate>} />
            <Route path="/downloads" element={<ResourceGate code="downloads"><DownloadsPage /></ResourceGate>} />
            <Route path="/terms" element={<LegalPage />} />
            <Route path="/privacy" element={<LegalPage />} />
            <Route path="/agreement" element={<LegalPage />} />
          </Route>
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<PrivateLayout />}>
            <Route path="/panel/supporters" element={<ResourceGate code="supporters"><SupportersPage /></ResourceGate>} />
            <Route path="/panel/rewards" element={<ResourceGate code="games"><RewardsPage /></ResourceGate>} />
            <Route path="/panel/wallet/game" element={<ResourceGate code="wallet"><GameExchangePage /></ResourceGate>} />
            <Route path="/panel/wallet/orders" element={<ResourceGate code="wallet"><WalletOrdersPage /></ResourceGate>} />
            <Route path="/panel/wallet/statement" element={<ResourceGate code="wallet"><WalletTransactionsPage /></ResourceGate>} />
            <Route path="/panel" element={<PainelPage />} />
            <Route path="/panel/profile" element={<ResourceGate code="profile"><ProfilePage /></ResourceGate>} />
            <Route path="/panel/security" element={<AccountSecurityPage />} />
            <Route path="/panel/wallet" element={<ResourceGate code="wallet"><WalletPage /></ResourceGate>} />
            <Route path="/panel/accounts" element={<ResourceGate code="accounts"><AccountsPage /></ResourceGate>} />
            <Route path="/panel/accounts/:login/:charId" element={<ResourceGate code="accounts"><CharacterPage /></ResourceGate>} />
            <Route path="/panel/inventory" element={<ResourceGate code="inventory"><InventoryPage /></ResourceGate>} />
            <Route path="/panel/games" element={<ResourceGate code="games"><GamesPage /></ResourceGate>} />
            <Route path="/panel/progress" element={<ResourceGate code="progress"><ProgressPage /></ResourceGate>} />
            <Route path="/panel/notifications" element={<ResourceGate code="notifications"><NotificationsPage /></ResourceGate>} />
            <Route path="/panel/support" element={<ResourceGate code="support"><SupportPage /></ResourceGate>} />
            <Route path="/panel/help" element={<ResourceGate code="help"><HelpPage /></ResourceGate>} />
            <Route path="/panel/shop" element={<ResourceGate code="shop"><ShopPage /></ResourceGate>} />
            <Route path="/panel/marketplace" element={<ResourceGate code="marketplace"><MarketplacePage /></ResourceGate>} />
            <Route path="/panel/auctions" element={<ResourceGate code="auction"><AuctionPage /></ResourceGate>} />
            <Route element={<RequireStaff />}>
              <Route path="/panel/admin/resources" element={<AdminResourcesPage />} />
              <Route path="/panel/admin/roadmap" element={<AdminRoadmapPage />} />
              <Route path="/panel/admin/supporters" element={<AdminSupportersPage />} />
              <Route path="/panel/admin/commerce" element={<AdminCommercePage />} />
              <Route path="/panel/admin/rewards" element={<AdminGameContentPage />} />
              <Route path="/panel/admin" element={<AdminHubPage />} />
              <Route path="/panel/admin/reports" element={<AdminReportsPage />} />
              <Route path="/panel/admin/reports/:category/:report?" element={<AdminReportsPage />} />
              <Route path="/panel/admin/financial/:report?" element={<AdminFinancialReportsRedirect />} />
              <Route path="/panel/admin/items" element={<AdminItemObservationPage />} />
              <Route path="/panel/admin/items/customs" element={<AdminCustomItemsPage />} />
              <Route path="/panel/admin/server" element={<AdminServerPage />} />
              <Route path="/panel/admin/accounts" element={<AdminAccountsPage />} />
              <Route path="/panel/admin/services" element={<AdminServicesPage />} />
              <Route path="/panel/admin/coins" element={<AdminCoinsPage />} />
              <Route path="/panel/admin/wallet" element={<AdminWalletPage />} />
              <Route path="/panel/admin/shop" element={<AdminShopPage />} />
              <Route path="/panel/admin/news" element={<AdminNewsPage />} />
              <Route path="/panel/admin/games" element={<AdminGamesPage />} />
              <Route path="/panel/admin/support" element={<AdminSupportPage />} />
              <Route path="/panel/admin/themes" element={<AdminThemesPage />} />
            </Route>
          </Route>
        </Route>

        {LEGACY_EXACT_REDIRECTS.map((item) => (
          <Route key={item.from} path={item.from} element={<Navigate to={item.to} replace />} />
        ))}
        <Route path="/painel/accounts/:login/:charId" element={<LegacyAccountDetailRedirect />} />
        <Route path="/painel/admin/relatorios/:category/:report?" element={<LegacyReportsRedirect />} />
        <Route path="/painel/admin/financeiro/:report?" element={<LegacyFinancialRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}
