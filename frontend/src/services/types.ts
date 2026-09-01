export interface ApiUser {
  id: string
  username: string
  email: string
  display_name: string
  bio: string
  role: string
  is_email_verified: boolean
  fichas: number
  avatar_url: string | null
  is_2fa_enabled?: boolean
  is_staff?: boolean
  is_superuser?: boolean
  is_staff_member?: boolean
}

export interface ApiServerInfo {
  name: string
  description: string
  chronicle: string
  rates: Record<string, string>
  enchant: Record<string, string>
  max_level: number
  features: string[]
  notes: Record<string, string>
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
  currency: string
  package_code: string
  method: string
  status: string
  checkout_url: string
  client_secret?: string
  bonus_applied: string
  total_credited: string
  pix_qr_code?: string
  pix_qr_code_base64?: string
  pix_ticket_url?: string
  boleto_url?: string
  boleto_barcode?: string
  gateway_message?: string
}

export interface ApiCoinPackage {
  id: string
  code: string
  name: string
  coins: string
  price_brl: string
  price_usd: string
  badge: string
  bonus: string
  total_coins: string
}

export interface ApiPaymentCatalog {
  currency: string
  methods: Array<{ id: string; public_key: string; currencies: string[] }>
  packages: ApiCoinPackage[]
  allow_custom_amount: boolean
}

export interface ApiBonusPreview {
  amount: string
  currency?: string
  coins?: string
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
  char_title: string
  char_sex: number
  char_pvp: number
  char_pk: number
  char_clan_name: string
  char_is_clan_leader: boolean
  equipment: Array<{
    item_id: number
    name: string
    quantity: number
    enchant: number
    slot: number | null
  }>
  price: string
  status: string
  notes: string
  created_at: string
  updated_at: string
  sold_at: string | null
}

export interface ApiAuthCapabilities {
  passkeys: boolean
  two_factor: boolean
  email_verification: boolean
  captcha: boolean
  hcaptcha_site_key: string
  google: boolean
  discord: boolean
  connected_providers: Array<'google' | 'discord'>
}

export interface ApiPasskeyCredential {
  id: string
  nickname: string
  created_at: string
  last_used_at: string | null
}

export interface ApiPasskeyBegin {
  options: Record<string, any>
  state: string
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
  item_id?: number
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

export interface ApiGamerProfile {
  xp: number
  level: number
  xp_next: number
  unlocked_now: string[]
  achievements: Array<{ code: string; name: string; description: string }>
  rewards: Array<{
    id: string
    kind: string
    reference: string
    description: string
    item_id?: number
    item_name: string
    quantity: number
    claimed: boolean
    available: boolean
  }>
}

export interface ApiBattlePass {
  season: { id: string; name: string; premium_price: string; ends_at: string } | null
  xp: number
  has_premium: boolean
  current_level: number
  levels: Array<{
    level: number
    required_xp: number
    unlocked: boolean
    rewards: Array<{
      id: string
      is_premium: boolean
      item_id?: number
      item_name: string
      quantity: number
      description: string
      claimed: boolean
      locked_premium: boolean
    }>
  }>
}

export interface ApiFishingState {
  fichas: number
  cost: number
  active: boolean
  rod: { level: number; xp: number }
  fish: Array<{ id: string; name: string; rarity: string; min_rod_level: number }>
  recent: Array<{ success: boolean; fish: string | null; created_at: string }>
}

export interface ApiEconomyState {
  fichas: number
  weapon: { level: number; fragments: number }
  monsters: Array<{
    id: string
    name: string
    level: number
    required_weapon_level: number
    fragment_reward: number
    alive: boolean
    respawn_in: number
  }>
}

export interface ApiAuction {
  id: string
  seller_id: string
  seller_username: string
  item_id: number
  item_name: string
  item_enchant: number
  quantity: number
  min_bid: string
  current_bid: string | null
  highest_bidder_id: string | null
  highest_bidder_username: string | null
  character_name: string
  ends_at: string
  status: string
  created_at: string
  updated_at: string
}
