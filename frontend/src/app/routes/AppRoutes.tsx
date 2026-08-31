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
import { WalletPage } from '../../pages/WalletPage'
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
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/downloads" element={<DownloadsPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/wallet" element={<WalletPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
