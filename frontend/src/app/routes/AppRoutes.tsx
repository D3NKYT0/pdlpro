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
import { ResetPasswordPage } from '../../pages/ResetPasswordPage'
import { ShopPage } from '../../pages/ShopPage'
import { SupportPage } from '../../pages/SupportPage'
import { HelpPage } from '../../pages/HelpPage'
import { VerifyEmailPage } from '../../pages/VerifyEmailPage'
import { WalletPage } from '../../pages/WalletPage'
import { InfoPage } from '../../pages/InfoPage'
import { WikiDetailPage } from '../../pages/WikiDetailPage'
import { WikiPage } from '../../pages/WikiPage'
import { LEGACY_PANEL_REDIRECTS } from './legacyRedirects'
import { AdminAccountsPage } from '../../pages/admin/AdminAccountsPage'
import { AdminCoinsPage } from '../../pages/admin/AdminCoinsPage'
import { AdminFinancialReportsPage } from '../../pages/admin/AdminFinancialReportsPage'
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

export function AppRoutes() {
  return (
    <BrowserRouter>
      <GlobalLoadingOverlay />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
          <Route element={<PublicContent />}>
            <Route path="/roadmap" element={<ResourceGate code="roadmap"><RoadmapPage /></ResourceGate>} />
            <Route path="/roadmap/:id" element={<ResourceGate code="roadmap"><RoadmapDetailPage /></ResourceGate>} />
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
            <Route path="/painel/apoiadores" element={<ResourceGate code="supporters"><SupportersPage /></ResourceGate>} />
            <Route path="/painel/recompensas" element={<ResourceGate code="games"><RewardsPage /></ResourceGate>} />
            <Route path="/painel/wallet/jogo" element={<ResourceGate code="wallet"><GameExchangePage /></ResourceGate>} />
            <Route path="/painel" element={<PainelPage />} />
            <Route path="/painel/profile" element={<ProfilePage />} />
            <Route path="/painel/security" element={<AccountSecurityPage />} />
            <Route path="/painel/wallet" element={<ResourceGate code="wallet"><WalletPage /></ResourceGate>} />
            <Route path="/painel/accounts" element={<AccountsPage />} />
            <Route path="/painel/accounts/:login/:charId" element={<CharacterPage />} />
            <Route path="/painel/inventory" element={<ResourceGate code="inventory"><InventoryPage /></ResourceGate>} />
            <Route path="/painel/games" element={<ResourceGate code="games"><GamesPage /></ResourceGate>} />
            <Route path="/painel/progress" element={<ProgressPage />} />
            <Route path="/painel/notifications" element={<NotificationsPage />} />
            <Route path="/painel/support" element={<SupportPage />} />
            <Route path="/painel/ajuda" element={<HelpPage />} />
            <Route path="/painel/shop" element={<ResourceGate code="shop"><ShopPage /></ResourceGate>} />
            <Route path="/painel/marketplace" element={<ResourceGate code="marketplace"><MarketplacePage /></ResourceGate>} />
            <Route path="/painel/auctions" element={<ResourceGate code="auction"><AuctionPage /></ResourceGate>} />
            <Route element={<RequireStaff />}>
              <Route path="/painel/admin/recursos" element={<AdminResourcesPage />} />
              <Route path="/painel/admin/roadmap" element={<AdminRoadmapPage />} />
              <Route path="/painel/admin/apoiadores" element={<AdminSupportersPage />} />
              <Route path="/painel/admin/comercio" element={<AdminCommercePage />} />
              <Route path="/painel/admin/recompensas" element={<AdminGameContentPage />} />
              <Route path="/painel/admin" element={<AdminHubPage />} />
              <Route path="/painel/admin/financeiro/:report?" element={<AdminFinancialReportsPage />} />
              <Route path="/painel/admin/itens" element={<AdminItemObservationPage />} />
              <Route path="/painel/admin/itens/customs" element={<AdminCustomItemsPage />} />
              <Route path="/painel/admin/servidor" element={<AdminServerPage />} />
              <Route path="/painel/admin/contas" element={<AdminAccountsPage />} />
              <Route path="/painel/admin/servicos" element={<AdminServicesPage />} />
              <Route path="/painel/admin/moedas" element={<AdminCoinsPage />} />
              <Route path="/painel/admin/loja" element={<AdminShopPage />} />
              <Route path="/painel/admin/noticias" element={<AdminNewsPage />} />
              <Route path="/painel/admin/jogos" element={<AdminGamesPage />} />
              <Route path="/painel/admin/atendimento" element={<AdminSupportPage />} />
              <Route path="/painel/admin/temas" element={<AdminThemesPage />} />
            </Route>
          </Route>
        </Route>

        {LEGACY_PANEL_REDIRECTS.map((item) => (
          <Route key={item.from} path={item.from} element={<Navigate to={item.to} replace />} />
        ))}
      </Routes>
    </BrowserRouter>
  )
}
