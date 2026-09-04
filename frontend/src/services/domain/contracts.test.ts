/** Contratos HTTP dos módulos: rota, verbo, payload e propagação de falhas. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from '../infra/http'
import { authApi, isTwoFactorChallenge } from './auth.service'
import { auctionApi } from './auction.service'
import { commerceApi } from './commerce.service'
import { contentApi } from './content.service'
import { gamesApi } from './games.service'
import { inventoryApi, lineageApi } from './lineage.service'
import { marketplaceApi } from './marketplace.service'
import { notificationApi } from './notification.service'
import { paymentApi } from './payment.service'
import { programsApi } from './programs.service'
import { pushApi } from './push.service'
import { serverApi } from './server.service'
import { shopApi } from './shop.service'
import { staffApi } from './staff.service'
import { staffSupportApi, supportApi } from './support.service'
import { walletApi } from './wallet.service'

vi.mock('../infra/http', () => ({ request: vi.fn() }))
const send = vi.mocked(request)
beforeEach(() => { send.mockReset() })

type Contract = [name: string, call: () => Promise<unknown>, path: string, method?: string, body?: unknown]
// Os valores esperados são exemplos explícitos do contrato público, não extraídos do código.
const contracts: Contract[] = [
  ['auth.csrf', () => authApi.csrf(), '/auth/csrf/'],
  ['auth.capabilities', () => authApi.capabilities(), '/auth/capabilities/'],
  ['auth.login', () => authApi.login('hero', 'secret'), '/auth/login/', 'POST', { login: 'hero', password: 'secret', hcaptcha_token: '' }],
  ['auth.login captcha', () => authApi.login('hero', 'secret', 'captcha'), '/auth/login/', 'POST', { login: 'hero', password: 'secret', hcaptcha_token: 'captcha' }],
  ['auth.verify2fa', () => authApi.verifyTwoFactor('challenge', '123456'), '/auth/2fa/verify/', 'POST', { challenge: 'challenge', code: '123456' }],
  ['auth.setup2fa', () => authApi.setupTwoFactor(), '/shared/me/2fa/', 'POST', { action: 'setup' }],
  ['auth.confirm2fa', () => authApi.confirmTwoFactor('123456'), '/shared/me/2fa/', 'POST', { action: 'confirm', code: '123456' }],
  ['auth.disable2fa', () => authApi.disableTwoFactor('123456'), '/shared/me/2fa/', 'POST', { action: 'disable', code: '123456' }],
  ['auth.progress', () => authApi.progress(), '/shared/me/progress/'],
  ['auth.reward', () => authApi.claimReward('reward'), '/shared/me/rewards/reward/claim/', 'POST'],
  ['auth.register', () => authApi.register({ username: 'hero', email: 'a@b.dev', password: 'secret', accept_terms: true }), '/auth/register/', 'POST', { username: 'hero', email: 'a@b.dev', password: 'secret', accept_terms: true }],
  ['auth.beginOAuth', () => authApi.beginOAuth('google', 'link'), '/auth/oauth/begin/', 'POST', { provider: 'google', mode: 'link' }],
  ['auth.completeOAuth', () => authApi.completeOAuth('discord', 'code', 'state'), '/auth/oauth/complete/', 'POST', { provider: 'discord', code: 'code', state: 'state' }],
  ['auth.requestVerification', () => authApi.requestEmailVerification(), '/auth/email/verify/request/', 'POST'],
  ['auth.verifyEmail', () => authApi.verifyEmail('token'), '/auth/email/verify/', 'POST', { token: 'token' }],
  ['auth.requestReset', () => authApi.requestPasswordReset('a@b.dev'), '/auth/password-reset/', 'POST', { email: 'a@b.dev' }],
  ['auth.confirmReset', () => authApi.confirmPasswordReset('token', 'secret'), '/auth/password-reset/confirm/', 'POST', { token: 'token', password: 'secret' }],
  ['auth.logout', () => authApi.logout(), '/auth/logout/', 'POST'],
  ['auth.me', () => authApi.me(), '/shared/me/'],
  ['auth.updateMe', () => authApi.updateMe({ bio: 'Hero' }), '/shared/me/', 'PATCH', { bio: 'Hero' }],
  ['auth.passkeys', () => authApi.passkeys(), '/auth/passkeys/'],
  ['auth.beginRegistration', () => authApi.beginPasskeyRegistration('key'), '/auth/passkeys/register/begin/', 'POST', { nickname: 'key' }],
  ['auth.finishRegistration', () => authApi.completePasskeyRegistration('state', { id: 'key' }, 'name'), '/auth/passkeys/register/complete/', 'POST', { state: 'state', credential: { id: 'key' }, nickname: 'name' }],
  ['auth.beginPasskey', () => authApi.beginPasskeyLogin('hero'), '/auth/passkeys/login/begin/', 'POST', { login: 'hero' }],
  ['auth.finishPasskey', () => authApi.completePasskeyLogin('state', { id: 'key' }), '/auth/passkeys/login/complete/', 'POST', { state: 'state', credential: { id: 'key' } }],
  ['auth.deletePasskey', () => authApi.deletePasskey('key'), '/auth/passkeys/key/', 'DELETE'],
  ['wallet.me', () => walletApi.me(), '/shared/wallet/'],
  ['wallet.transfer', () => walletApi.transfer('friend', '10.25'), '/shared/wallet/transfer/', 'POST', { recipient_username: 'friend', amount: '10.25', description: '' }],
  ['wallet.description', () => walletApi.transfer('friend', '10.25', 'Gift'), '/shared/wallet/transfer/', 'POST', { recipient_username: 'friend', amount: '10.25', description: 'Gift' }],
  ['wallet.transactions', () => walletApi.transactions(), '/shared/wallet/transactions/'],
  ['shop.catalog', () => shopApi.catalog(), '/shared/shop/catalog/'],
  ['shop.cart', () => shopApi.cart(), '/shared/shop/cart/'],
  ['shop.add', () => shopApi.addToCart('item'), '/shared/shop/cart/', 'POST', { item_id: 'item', quantity: 1 }],
  ['shop.quantity', () => shopApi.addToCart('item', 3), '/shared/shop/cart/', 'POST', { item_id: 'item', quantity: 3 }],
  ['shop.update', () => shopApi.updateCartItem('line', 2), '/shared/shop/cart/line/', 'PATCH', { quantity: 2 }],
  ['shop.remove', () => shopApi.removeCartItem('line'), '/shared/shop/cart/line/', 'DELETE'],
  ['shop.checkout', () => shopApi.checkout(), '/shared/shop/checkout/', 'POST'],
  ['payment.catalog', () => paymentApi.catalog(), '/customer/payments/catalog/'],
  ['payment.list', () => paymentApi.list(), '/customer/payments/'],
  ['payment.create', () => paymentApi.create({ amount: '12.34', method: 'mock', currency: 'BRL' }), '/customer/payments/', 'POST', { amount: '12.34', method: 'mock', currency: 'BRL' }],
  ['payment.preview', () => paymentApi.preview({ amount: '12.34' }), '/customer/payments/preview/', 'POST', { amount: '12.34' }],
  ['payment.confirm', () => paymentApi.confirm('order'), '/customer/payments/order/confirm/', 'POST'],
  ['payment.process', () => paymentApi.process('order', { token: 'opaque' }), '/customer/payments/order/process/', 'POST', { token: 'opaque' }],
  ['payment.status', () => paymentApi.status('order'), '/customer/payments/order/status/'],
  ['payment.cancel', () => paymentApi.cancel('order'), '/customer/payments/order/cancel/', 'POST'],
  ['auction.open', () => auctionApi.open(), '/public/auctions/'],
  ['auction.mine', () => auctionApi.mine(), '/customer/auctions/'],
  ['auction.create', () => auctionApi.create({ inventory_id: 'inv', item_id: 57, quantity: 2, enchant: 0, min_bid: '10', hours: 24 }), '/customer/auctions/', 'POST', { inventory_id: 'inv', item_id: 57, quantity: 2, enchant: 0, min_bid: '10', hours: 24 }],
  ['auction.bid', () => auctionApi.bid('auction', '11', 'Hero'), '/customer/auctions/auction/bid/', 'POST', { amount: '11', character_name: 'Hero' }],
  ['market.catalog', () => marketplaceApi.catalog(), '/public/marketplace/'],
  ['market.mine', () => marketplaceApi.mine(), '/customer/marketplace/'],
  ['market.list', () => marketplaceApi.list({ char_id: 7, price: '25' }), '/customer/marketplace/', 'POST', { char_id: 7, price: '25' }],
  ['market.buy', () => marketplaceApi.buy('listing'), '/customer/marketplace/listing/buy/', 'POST'],
  ['market.cancel', () => marketplaceApi.cancel('listing'), '/customer/marketplace/listing/cancel/', 'POST'],
  ['notifications.list', () => notificationApi.list(), '/customer/notifications/'],
  ['notifications.read', () => notificationApi.markRead('note'), '/customer/notifications/note/read/', 'POST'],
  ['notifications.readAll', () => notificationApi.markAllRead(), '/customer/notifications/read-all/', 'POST'],
  ['content.news', () => contentApi.news(), '/public/news/'],
  ['content.detail', () => contentApi.newsDetail('update'), '/public/news/update/'],
  ['content.faq', () => contentApi.faq(), '/public/faq/'],
  ['content.faqEnglish', () => contentApi.faq('en'), '/public/faq/?lang=en'],
  ['content.authenticatedFaq', () => contentApi.authenticatedFaq(), '/shared/content/faq/'],
  ['content.assistantReply', () => contentApi.assistantReply('Where is my account?', 'en'), '/shared/content/assistant/reply/', 'POST', { message: 'Where is my account?', language: 'en' }],
  ['content.downloads', () => contentApi.downloads(), '/public/downloads/'],
  ['content.wiki', () => contentApi.wiki(), '/public/wiki/'],
  ['content.search', () => contentApi.wiki('a & b'), '/public/wiki/?q=a%20%26%20b'],
  ['content.page', () => contentApi.wikiPage('guide'), '/public/wiki/guide/'],
  ['content.calendar', () => contentApi.calendar(), '/public/calendar/'],
  ['content.legal', () => contentApi.legal(), '/public/legal/'],
  ['content.document', () => contentApi.legalDocument('terms'), '/public/legal/terms/'],
  ['server.info', () => serverApi.info(), '/public/server/info/'],
  ['server.status', () => serverApi.status(), '/public/server/status/'],
  ['server.rankings', () => serverApi.rankings('pvp'), '/public/server/rankings/pvp/'],
  ['server.limit', () => serverApi.rankings('pvp', 10), '/public/server/rankings/pvp/?limit=10'],
  ['server.world', () => serverApi.world('bosses'), '/public/server/world/bosses/'],
  ['lineage.accounts', () => lineageApi.accounts(), '/customer/server/accounts/'],
  ['lineage.register', () => lineageApi.register('secret'), '/customer/server/accounts/register/', 'POST', { password: 'secret' }],
  ['lineage.explicitLogin', () => lineageApi.register('secret', 'hero'), '/customer/server/accounts/register/', 'POST', { password: 'secret', login: 'hero' }],
  ['lineage.link', () => lineageApi.link('hero', 'secret'), '/customer/server/accounts/link/', 'POST', { login: 'hero', password: 'secret' }],
  ['lineage.emailLink', () => lineageApi.requestLinkByEmail('a@b.dev'), '/customer/server/accounts/link-email/', 'POST', { email: 'a@b.dev' }],
  ['lineage.confirmLink', () => lineageApi.confirmLinkByEmail('token'), '/customer/server/accounts/link-email/confirm/', 'POST', { token: 'token' }],
  ['lineage.unlink', () => lineageApi.unlink('hero'), '/customer/server/accounts/unlink/', 'POST', { login: 'hero' }],
  ['lineage.characters', () => lineageApi.characters(), '/customer/server/characters/'],
  ['lineage.accountCharacters', () => lineageApi.characters('a&b'), '/customer/server/characters/?login=a%26b'],
  ['lineage.character', () => lineageApi.character('a&b', 7), '/customer/server/characters/7/?login=a%26b'],
  ['lineage.prices', () => lineageApi.servicePrices(), '/customer/server/services/'],
  ['lineage.nickname', () => lineageApi.changeNickname('hero', 7, 'New'), '/customer/server/characters/nickname/', 'POST', { login: 'hero', char_id: 7, name: 'New' }],
  ['lineage.sex', () => lineageApi.changeSex('hero', 7, 'F'), '/customer/server/characters/sex/', 'POST', { login: 'hero', char_id: 7, sex: 'F' }],
  ['lineage.unstuck', () => lineageApi.unstuck('hero', 7), '/customer/server/characters/unstuck/', 'POST', { login: 'hero', char_id: 7 }],
  ['inventory.dashboard', () => inventoryApi.dashboard(), '/customer/inventory/'],
  ['inventory.account', () => inventoryApi.dashboard('a&b'), '/customer/inventory/?login=a%26b'],
  ['inventory.items', () => inventoryApi.gameItems(7), '/customer/inventory/characters/7/items/'],
  ['inventory.accountItems', () => inventoryApi.gameItems(7, 'a&b'), '/customer/inventory/characters/7/items/?login=a%26b'],
  ['inventory.equipment', () => inventoryApi.equipment(7), '/customer/inventory/characters/7/equipment/'],
  ['inventory.accountEquipment', () => inventoryApi.equipment(7, 'a&b'), '/customer/inventory/characters/7/equipment/?login=a%26b'],
  ['inventory.withdraw', () => inventoryApi.withdraw({ char_id: 7, item_id: 57, quantity: 2 }), '/customer/inventory/withdraw/', 'POST', { char_id: 7, item_id: 57, quantity: 2 }],
  ['inventory.deposit', () => inventoryApi.deposit({ inventory_id: 'inv', item_id: 57, quantity: 2, enchant: 0 }), '/customer/inventory/deposit/', 'POST', { inventory_id: 'inv', item_id: 57, quantity: 2, enchant: 0 }],
  ['inventory.trade', () => inventoryApi.trade({ origin_inventory_id: 'a', destination_inventory_id: 'b', item_id: 57, quantity: 2, enchant: 0 }), '/customer/inventory/trade/', 'POST', { origin_inventory_id: 'a', destination_inventory_id: 'b', item_id: 57, quantity: 2, enchant: 0 }],
  ['games.roulette', () => gamesApi.roulette(), '/customer/games/roulette/'],
  ['games.spin', () => gamesApi.spin(), '/customer/games/roulette/', 'POST'],
  ['games.tokens', () => gamesApi.buyTokens(3), '/customer/games/tokens/', 'POST', { amount: 3 }],
  ['games.daily', () => gamesApi.dailyBonus(), '/customer/games/daily-bonus/'],
  ['games.claimDaily', () => gamesApi.claimDailyBonus(), '/customer/games/daily-bonus/', 'POST'],
  ['games.bag', () => gamesApi.bag(), '/customer/games/bag/'],
  ['games.transfer', () => gamesApi.transferBag('inv'), '/customer/games/bag/', 'POST', { inventory_id: 'inv' }],
  ['games.boxes', () => gamesApi.boxes(), '/customer/games/boxes/'],
  ['games.buyBox', () => gamesApi.buyBox('box'), '/customer/games/boxes/', 'POST', { box_type_id: 'box' }],
  ['games.openBox', () => gamesApi.openBox('box'), '/customer/games/boxes/box/open/', 'POST'],
  ['games.minigames', () => gamesApi.minigames(), '/customer/games/minigames/'],
  ['games.dice', () => gamesApi.dice({ bet_type: 'number', amount: 2, number: 6 }), '/customer/games/dice/', 'POST', { bet_type: 'number', amount: 2, number: 6 }],
  ['games.slots', () => gamesApi.slots(), '/customer/games/slots/', 'POST'],
  ['games.fishing', () => gamesApi.fishing(), '/customer/games/fishing/'],
  ['games.cast', () => gamesApi.cast(), '/customer/games/fishing/', 'POST', {}],
  ['games.bait', () => gamesApi.cast('bait'), '/customer/games/fishing/', 'POST', { bait_id: 'bait' }],
  ['games.economy', () => gamesApi.economy(), '/customer/games/economy/'],
  ['games.fight', () => gamesApi.fight('monster'), '/customer/games/economy/monster/fight/', 'POST'],
  ['games.enchant', () => gamesApi.enchant(), '/customer/games/economy/enchant/', 'POST'],
  ['games.battlePass', () => gamesApi.battlePass(), '/customer/games/battle-pass/'],
  ['games.claimPass', () => gamesApi.claimBattlePass('reward'), '/customer/games/battle-pass/reward/claim/', 'POST'],
  ['games.premium', () => gamesApi.buyBattlePassPremium(), '/customer/games/battle-pass/', 'POST'],
  ['program.resources', () => programsApi.resources(), '/public/resources/'],
  ['program.toggle', () => programsApi.toggleResource('feature', false), '/staff/resources/feature/', 'PATCH', { enabled: false }],
  ['program.roadmap', () => programsApi.roadmap(), '/public/roadmap/'],
  ['program.staffRoadmap', () => programsApi.roadmap(true), '/staff/roadmap/'],
  ['program.detail', () => programsApi.roadmapDetail('entry'), '/public/roadmap/entry/'],
  ['program.create', () => programsApi.saveRoadmap({ title: 'New' }), '/staff/roadmap/', 'POST', { title: 'New' }],
  ['program.update', () => programsApi.saveRoadmap({ progress: 50 }, 'entry'), '/staff/roadmap/entry/', 'PATCH', { progress: 50 }],
  ['program.delete', () => programsApi.deleteRoadmap('entry'), '/staff/roadmap/entry/', 'DELETE'],
  ['program.supporter', () => programsApi.supporter(), '/customer/supporters/'],
  ['program.payout', () => programsApi.payout(), '/customer/supporters/payout/', 'POST', {}],
  ['program.staff', () => programsApi.staffSupporters(), '/staff/supporters/'],
  ['program.review', () => programsApi.reviewSupporter('profile', { status: 'approved' }), '/staff/supporters/profile/', 'PATCH', { status: 'approved' }],
  ['program.reviewPayout', () => programsApi.reviewPayout('payout', 'paid'), '/staff/supporter-payouts/payout/', 'PATCH', { status: 'paid' }],
  ['program.battle', () => programsApi.battle(), '/customer/games/battle-pass/details/'],
  ['program.battleAction', () => programsApi.battleAction('claim', 'entry', false), '/customer/games/battle-pass/details/', 'POST', { action: 'claim', entry_id: 'entry', enabled: false }],
  ['program.daily', () => programsApi.daily(), '/customer/games/daily-bonus/details/'],
  ['program.fishing', () => programsApi.fishing(), '/customer/games/fishing/details/'],
  ['program.bait', () => programsApi.buyBait('bait', 2), '/customer/games/fishing/details/', 'POST', { bait_id: 'bait', quantity: 2 }],
  ['program.stats', () => programsApi.stats('dice'), '/customer/games/statistics/dice/'],
  ['program.config', () => programsApi.configs('baits'), '/staff/game-content/baits/'],
  ['program.createConfig', () => programsApi.saveConfig('baits', { name: 'New' }), '/staff/game-content/baits/', 'POST', { name: 'New' }],
  ['program.updateConfig', () => programsApi.saveConfig('baits', { active: false }, 'bait'), '/staff/game-content/baits/bait/', 'PATCH', { active: false }],
  ['commerce.packages', () => commerceApi.packages(), '/shared/shop/commerce/packages/'],
  ['commerce.quote', () => commerceApi.quote(), '/shared/shop/commerce/quote/'],
  ['commerce.options', () => commerceApi.options({ use_bonus: false, promo_code: 'SAVE' }), '/shared/shop/commerce/options/', 'POST', { use_bonus: false, promo_code: 'SAVE' }],
  ['commerce.quantity', () => commerceApi.packageQuantity('pack', 0), '/shared/shop/commerce/packages/', 'POST', { package_id: 'pack', quantity: 0 }],
  ['commerce.purchases', () => commerceApi.purchases(), '/shared/shop/commerce/purchases/'],
  ['commerce.checkout', () => commerceApi.checkout('idempotency-key'), '/shared/shop/checkout/', 'POST', { request_key: 'idempotency-key' }],
  ['commerce.staffPackages', () => commerceApi.staffPackages(), '/staff/commerce/packages/'],
  ['commerce.staffPromos', () => commerceApi.staffPromos(), '/staff/commerce/promos/'],
  ['commerce.create', () => commerceApi.save('promos', { code: 'SAVE' }), '/staff/commerce/promos/', 'POST', { code: 'SAVE' }],
  ['commerce.update', () => commerceApi.save('promos', { active: false }, 'promo'), '/staff/commerce/promos/promo/', 'PATCH', { active: false }],
  ['commerce.state', () => commerceApi.exchangeState(), '/shared/wallet/game-exchange/'],
  ['commerce.exchange', () => commerceApi.exchange({ request_key: 'key', direction: 'to_game', login: 'hero', character_id: 7, quantity: 2 }), '/shared/wallet/game-exchange/', 'POST', { request_key: 'key', direction: 'to_game', login: 'hero', character_id: 7, quantity: 2 }],
  ['support.list', () => supportApi.list(), '/customer/support/'],
  ['support.detail', () => supportApi.detail('ticket'), '/customer/support/ticket/'],
  ['support.create', () => supportApi.create({ subject: 'Ajuda', description: 'Problema', category: 'general', priority: 'normal' }), '/customer/support/', 'POST', { subject: 'Ajuda', description: 'Problema', category: 'general', priority: 'normal' }],
  ['support.reply', () => supportApi.reply('ticket', 'Olá'), '/customer/support/ticket/', 'POST', { body: 'Olá' }],
  ['support.action', () => supportApi.action('ticket', 'close'), '/customer/support/ticket/', 'PATCH', { action: 'close' }],
  ['staffSupport.list', () => staffSupportApi.list(), '/staff/support/'],
  ['staffSupport.filter', () => staffSupportApi.list({ q: 'a & b', status: 'open', category: '' }), '/staff/support/?q=a+%26+b&status=open'],
  ['staffSupport.detail', () => staffSupportApi.detail('ticket'), '/staff/support/ticket/'],
  ['staffSupport.reply', () => staffSupportApi.reply('ticket', 'Resposta'), '/staff/support/ticket/', 'POST', { body: 'Resposta', is_internal: false }],
  ['staffSupport.internal', () => staffSupportApi.reply('ticket', 'Nota', true), '/staff/support/ticket/', 'POST', { body: 'Nota', is_internal: true }],
  ['staffSupport.update', () => staffSupportApi.update('ticket', { assigned_to: null }), '/staff/support/ticket/', 'PATCH', { assigned_to: null }],
  ['staff.panel', () => staffApi.panel(), '/staff/panel/'],
  ['staff.savePanel', () => staffApi.savePanel({ name: 'Server' }), '/staff/panel/', 'PUT', { name: 'Server' }],
  ['staff.services', () => staffApi.services(), '/staff/services/'],
  ['staff.saveServices', () => staffApi.saveServices([]), '/staff/services/', 'PUT', []],
  ['staff.coins', () => staffApi.coins(), '/staff/coins/'],
  ['staff.saveCoins', () => staffApi.saveCoins({ multiplier: '2' }), '/staff/coins/', 'PUT', { multiplier: '2' }],
  ['staff.shop', () => staffApi.shop(), '/staff/shop/'],
  ['staff.createItem', () => staffApi.saveShopItem({ name: 'Sword' }), '/staff/shop/', 'POST', { name: 'Sword' }],
  ['staff.updateItem', () => staffApi.saveShopItem({ id: 'item', active: false }), '/staff/shop/', 'PUT', { id: 'item', active: false }],
  ['staff.news', () => staffApi.news(), '/staff/news/'],
  ['staff.createNews', () => staffApi.saveNews({ title: 'Update' }), '/staff/news/', 'POST', { title: 'Update' }],
  ['staff.updateNews', () => staffApi.saveNews({ id: 'news', is_published: false }), '/staff/news/', 'PUT', { id: 'news', is_published: false }],
  ['staff.games', () => staffApi.games(), '/staff/games/'],
  ['staff.saveGame', () => staffApi.saveGame({ active: false }), '/staff/games/', 'PUT', { active: false }],
  ['staff.inspect', () => staffApi.inspectAccount('a&b'), '/staff/accounts/?login=a%26b'],
  ['staff.unlink', () => staffApi.unlinkAccount('hero'), '/staff/accounts/unlink/', 'POST', { login: 'hero' }],
  ['push.vapid', () => pushApi.vapid(), '/customer/push/vapid/'],
  ['push.subscribe', () => pushApi.subscribe({ endpoint: 'https://push.test/key' }), '/customer/push/subscribe/', 'POST', { endpoint: 'https://push.test/key' }],
  ['push.unsubscribe', () => pushApi.unsubscribe('https://push.test/key'), '/customer/push/subscribe/', 'DELETE', { endpoint: 'https://push.test/key' }],
]

describe('contratos dos serviços de domínio', () => {
  it.each(contracts)('%s', async (_name, call, path, method = 'GET', body) => {
    const response = { marker: 'server-response' }
    send.mockResolvedValue(response)
    expect(await call()).toBe(response)
    expect(send).toHaveBeenCalledTimes(1)
    const [actualPath, options] = send.mock.calls[0]
    expect(actualPath).toBe(path)
    expect(options?.method ?? 'GET').toBe(method)
    expect(options?.body === undefined ? undefined : JSON.parse(String(options.body))).toEqual(body)
  })

  it('propaga a falha do transporte para a tela decidir como apresentar', async () => {
    const error = new Error('offline')
    send.mockRejectedValue(error)
    await expect(commerceApi.checkout('key')).rejects.toBe(error)
  })

  it.each([['perfil', (data: FormData) => authApi.updateMe(data)], ['apoiador', (data: FormData) => programsApi.apply(data)]] as const)('preserva FormData de %s', async (_name, call) => {
    const body = new FormData()
    body.append('name', 'Hero')
    await call(body)
    expect(send.mock.calls[0][1]?.body).toBe(body)
  })

  it.each([null, undefined, false, {}, { requires_2fa: true }, { requires_2fa: true, challenge: 1 }, { requires_2fa: false, challenge: 'x' }])('não confunde %j com desafio 2FA', value => {
    expect(isTwoFactorChallenge(value)).toBe(false)
  })
  it('reconhece o desafio 2FA', () => expect(isTwoFactorChallenge({ requires_2fa: true, challenge: 'token' })).toBe(true))
})
