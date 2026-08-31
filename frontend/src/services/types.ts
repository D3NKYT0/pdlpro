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

export interface ApiPaymentOrder {
  id: string
  amount: string
  coins: string
  method: string
  status: string
  checkout_url: string
  bonus_applied: string
  total_credited: string
}

export interface ApiBonusPreview {
  amount: string
  bonus: string
  percent: string
  description: string
  total: string
}

export interface ApiCharacterListing {
  id: string
  seller_username: string
  char_id: number
  char_name: string
  char_level: number
  char_class: number
  price: string
  status: string
  notes: string
}

export interface ApiNotification {
  id: string
  title: string
  body: string
  kind: string
  link: string
  is_read: boolean
  created_at: string
}

export interface ApiNotificationList {
  unread: number
  results: ApiNotification[]
}

export interface ApiRoulettePrize {
  id: string
  name: string
  weight: number
  rarity: string
}

export interface ApiRouletteState {
  fichas: number
  fail_chance: number
  cost: number
  prizes: ApiRoulettePrize[]
}

export interface ApiSpinResult {
  failed: boolean
  fichas: number
  prize: { name: string; rarity: string; enchant: number } | null
}

export interface ApiDailyBonus {
  claimed?: boolean
  amount: string
  claimed_on?: string
  active?: boolean
}

export interface ApiBagItem {
  item_id: number
  item_name: string
  quantity: number
  enchant: number
}

export interface ApiClan {
  id: string
  name: string
  description: string
  recruiting: boolean
  owner_id: string
  owner_username: string
  motd: string
  focus: string
  min_level: number
  clan_id: number | null
}

export interface ApiClanApplication {
  id: string
  clan_id: string
  clan_name: string
  user_id: string
  username: string
  char_name: string
  message: string
  status: string
}

export interface ApiPost {
  id: string
  author_id: string
  author_username: string
  body: string
  created_at: string
}

export interface ApiAuction {
  id: string
  seller_username: string
  item_id: number
  item_name: string
  item_enchant: number
  quantity: number
  min_bid: string
  current_bid: string | null
  character_name: string
  ends_at: string
  status: string
}
