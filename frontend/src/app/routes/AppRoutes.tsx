import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { DownloadsPage } from '../../pages/DownloadsPage'
import { HomePage } from '../../pages/HomePage'
import { LoginPage } from '../../pages/LoginPage'
import { NewsDetailPage } from '../../pages/NewsDetailPage'
import { NewsPage } from '../../pages/NewsPage'
import { RankingsPage } from '../../pages/RankingsPage'
import { RegisterPage } from '../../pages/RegisterPage'
import { ShopPage } from '../../pages/ShopPage'
import { AccountsPage } from '../../pages/AccountsPage'
import { AuctionPage } from '../../pages/AuctionPage'
import { CalendarPage } from '../../pages/CalendarPage'
import { ClansPage } from '../../pages/ClansPage'
import { FaqPage } from '../../pages/FaqPage'
import { FeedPage } from '../../pages/FeedPage'
import { FriendsPage } from '../../pages/FriendsPage'
import { GamesPage } from '../../pages/GamesPage'
import { InventoryPage } from '../../pages/InventoryPage'
import { MarketplacePage } from '../../pages/MarketplacePage'
import { NotificationsPage } from '../../pages/NotificationsPage'
import { WalletPage } from '../../pages/WalletPage'
import { WikiDetailPage } from '../../pages/WikiDetailPage'
import { WikiPage } from '../../pages/WikiPage'
import { RequireAuth } from './RequireAuth'

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/rankings" element={<RankingsPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/news/:slug" element={<NewsDetailPage />} />
          <Route path="/wiki" element={<WikiPage />} />
          <Route path="/wiki/:slug" element={<WikiDetailPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/auctions" element={<AuctionPage />} />
          <Route path="/clans" element={<ClansPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/downloads" element={<DownloadsPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/friends" element={<FriendsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
