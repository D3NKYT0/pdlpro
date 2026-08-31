export interface ApiUser {
  id: string
  username: string
  email: string
  display_name: string
  role: string
  is_email_verified: boolean
  fichas: number
  avatar_url: string | null
}

export interface ApiServerStatus {
  game_online: boolean
  login_online: boolean
  players_online: number
}

export interface ApiRankingEntry {
  position: number
  name: string
  value: number
}

export interface ApiWallet {
  id: string
  balance: string
  bonus_balance: string
}

export interface ApiShopItem {
  id: string
  name: string
  item_id: number
  price: string
  quantity: number
}

export interface ApiNews {
  id: string
  slug: string
  title: string
  excerpt: string
  body: string
  published_at: string
}
