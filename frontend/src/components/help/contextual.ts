import { canAccessStaff } from '../../lib/staff'
import type { HelpLanguage } from './personality'

export type HelpIdentity = Parameters<typeof canAccessStaff>[0]
export type HelpResources = readonly { code: string; enabled: boolean }[]
export interface HelpContext {
  path: string
  title: string
  tip: string
  suggestion: string
  actions: Array<{ to: string; label: string }>
}
type Copy = Record<HelpLanguage, string>
interface Topic {
  path: string
  title: Copy
  tip: Copy
  suggestion: Copy
  action: Copy
  related?: string[]
  resource?: string
  staff?: boolean
}
const copy = (pt: string, en: string): Copy => ({ pt, en })

// Navigation is selected here, never taken from a generated URL or a query parameter.
const topics: Topic[] = [
  {
    path: '/painel', title: copy('Painel', 'Dashboard'), action: copy('Abrir meu painel', 'Open my dashboard'),
    tip: copy('Use o menu para consultar suas contas, acompanhar seu progresso e encontrar os recursos do servidor.', 'Use the menu to view your accounts, follow your progress and find server features.'),
    suggestion: copy('Por onde começo no painel do PDL?', 'Where should I start in the PDL dashboard?'), related: ['/painel/accounts', '/painel/support'],
  },
  {
    path: '/painel/accounts', title: copy('Contas e personagens', 'Accounts and characters'), action: copy('Abrir minhas contas', 'Open my accounts'),
    tip: copy('Confira qual conta L2 está selecionada antes de abrir os personagens. O inventário usa as contas vinculadas ao seu perfil.', 'Check the selected L2 account before opening its characters. The inventory uses accounts linked to your profile.'),
    suggestion: copy('Como encontro minhas contas L2 e meus personagens?', 'How do I find my L2 accounts and characters?'), related: ['/painel/inventory', '/painel/security'],
  },
  {
    path: '/painel/wallet', title: copy('Carteira', 'Wallet'), action: copy('Abrir minha carteira', 'Open my wallet'), resource: 'wallet',
    tip: copy('Consulte o saldo, o histórico e o status do pedido na carteira. Confira o destinatário e a quantidade antes de confirmar uma transferência.', 'Check your balance, history and order status in the wallet. Check the recipient and amount before confirming a transfer.'),
    suggestion: copy('Como acompanho meu saldo e o status de uma compra de moedas?', 'How do I check my balance and the status of a coin purchase?'), related: ['/painel/wallet/jogo', '/painel/support'],
  },
  {
    path: '/painel/wallet/jogo', title: copy('Troca para o jogo', 'Game exchange'), action: copy('Abrir troca para o jogo', 'Open game exchange'), resource: 'wallet',
    tip: copy('Selecione a conta e o personagem de destino e confira a prévia da troca antes de confirmar.', 'Select the destination account and character and review the exchange preview before confirming.'),
    suggestion: copy('Como confiro o destino e a prévia da troca para o jogo?', 'How do I check the destination and preview of a game exchange?'), related: ['/painel/accounts', '/painel/wallet'],
  },
  {
    path: '/painel/inventory', title: copy('Inventário', 'Inventory'), action: copy('Abrir meu inventário', 'Open my inventory'), resource: 'inventory',
    tip: copy('Escolha a conta e o personagem para consultar os itens. As abas separam os itens dos personagens da mochila de recompensas.', 'Choose an account and character to view items. The tabs separate character items from the reward bag.'),
    suggestion: copy('Qual é a diferença entre o inventário dos personagens e a mochila de recompensas?', 'What is the difference between character inventory and the reward bag?'), related: ['/painel/accounts', '/painel/support'],
  },
  {
    path: '/painel/shop', title: copy('Loja', 'Shop'), action: copy('Abrir a loja', 'Open the shop'), resource: 'shop',
    tip: copy('Confira os itens, a quantidade e o total do carrinho antes de concluir a compra. Consulte a carteira para acompanhar suas moedas.', 'Check the items, quantities and cart total before completing a purchase. Visit the wallet to track your coins.'),
    suggestion: copy('Como confiro os itens e o total da minha compra na loja?', 'How do I check the items and total of my shop purchase?'), related: ['/painel/wallet', '/painel/inventory'],
  },
  {
    path: '/painel/marketplace', title: copy('Marketplace', 'Marketplace'), action: copy('Abrir marketplace', 'Open marketplace'), resource: 'marketplace',
    tip: copy('Compare o item, a quantidade e o preço do anúncio. Confira seu inventário antes de anunciar um item.', 'Compare the item, quantity and listing price. Check your inventory before listing an item.'),
    suggestion: copy('O que devo conferir antes de comprar ou anunciar no marketplace?', 'What should I check before buying or listing on the marketplace?'), related: ['/painel/inventory', '/painel/wallet'],
  },
  {
    path: '/painel/auctions', title: copy('Leilões', 'Auctions'), action: copy('Abrir leilões', 'Open auctions'), resource: 'auction',
    tip: copy('Confira o item, o lance atual e o prazo do leilão antes de enviar um lance.', 'Check the item, current bid and auction deadline before placing a bid.'),
    suggestion: copy('Como acompanho um leilão e confiro meu lance?', 'How do I follow an auction and check my bid?'), related: ['/painel/wallet', '/painel/support'],
  },
  {
    path: '/painel/games', title: copy('Jogos', 'Games'), action: copy('Abrir jogos', 'Open games'), resource: 'games',
    tip: copy('Leia as regras e os custos exibidos em cada jogo. Consulte a mochila para acompanhar os itens recebidos.', 'Read the rules and costs shown for each game. Visit the bag to track received items.'),
    suggestion: copy('Onde confiro as regras dos jogos e as recompensas recebidas?', 'Where do I check game rules and received rewards?'), related: ['/painel/inventory', '/painel/recompensas'],
  },
  {
    path: '/painel/recompensas', title: copy('Jornada e recompensas', 'Journey and rewards'), action: copy('Abrir minhas recompensas', 'Open my rewards'), resource: 'games',
    tip: copy('Consulte as missões, os requisitos e as recompensas disponíveis. O progresso exibido na tela indica o que já foi registrado pelo sistema.', 'Check missions, requirements and available rewards. The progress shown on screen reflects what the system has recorded.'),
    suggestion: copy('Como acompanho as missões e resgato uma recompensa disponível?', 'How do I track missions and claim an available reward?'), related: ['/painel/inventory', '/painel/progress'],
  },
  {
    path: '/painel/apoiadores', title: copy('Apoiadores', 'Supporters'), action: copy('Abrir área de apoiadores', 'Open supporters area'), resource: 'supporters',
    tip: copy('Acompanhe o status do seu cadastro, os cupons e as comissões disponíveis nesta área.', 'Track your application status, coupons and available commissions in this area.'),
    suggestion: copy('Como acompanho meu cadastro e minhas comissões de apoiador?', 'How do I track my supporter application and commissions?'), related: ['/painel/support'],
  },
  {
    path: '/painel/profile', title: copy('Meu perfil', 'My profile'), action: copy('Abrir meu perfil', 'Open my profile'),
    tip: copy('Atualize os dados de apresentação do seu perfil. As opções de acesso ficam em Conta e segurança.', 'Update your profile presentation details. Sign-in options are under Account and security.'),
    suggestion: copy('Como atualizo meu perfil e encontro as opções de segurança?', 'How do I update my profile and find security options?'), related: ['/painel/security'],
  },
  {
    path: '/painel/security', title: copy('Conta e segurança', 'Account and security'), action: copy('Abrir segurança da conta', 'Open account security'),
    tip: copy('Consulte os métodos de acesso e as sessões da sua conta. Nunca envie senhas ou códigos de autenticação no chat.', 'Review your account sign-in methods and sessions. Never share passwords or authentication codes in chat.'),
    suggestion: copy('Como reviso as opções de segurança da minha conta?', 'How do I review my account security options?'), related: ['/painel/support'],
  },
  {
    path: '/painel/progress', title: copy('Progresso', 'Progress'), action: copy('Abrir meu progresso', 'Open my progress'),
    tip: copy('Consulte suas conquistas e o progresso registrado. Os requisitos de cada objetivo ajudam a escolher o próximo passo.', 'Check your achievements and recorded progress. Each goal’s requirements can help you choose your next step.'),
    suggestion: copy('Como acompanho meu progresso e minhas conquistas no PDL?', 'How do I track my progress and achievements in PDL?'), related: ['/painel/recompensas'],
  },
  {
    path: '/painel/notifications', title: copy('Avisos', 'Notifications'), action: copy('Abrir meus avisos', 'Open my notifications'),
    tip: copy('Consulte os avisos recebidos e marque os que já leu. Para conversar com a equipe, abra o Atendimento.', 'Review received notifications and mark the ones you have read. Open Support to talk to the team.'),
    suggestion: copy('Como acompanho os avisos e entro em contato com a equipe?', 'How do I follow notifications and contact the team?'), related: ['/painel/support'],
  },
  {
    path: '/painel/support', title: copy('Atendimento', 'Support'), action: copy('Ir ao atendimento', 'Contact the team'),
    tip: copy('Descreva o que aconteceu e a tela envolvida no chamado. Acompanhe as respostas da equipe no mesmo atendimento.', 'Describe what happened and which screen was involved in your ticket. Follow team replies in the same support conversation.'),
    suggestion: copy('Como abro e acompanho um chamado para a equipe?', 'How do I open and follow a support ticket?'), related: ['/painel/notifications'],
  },
  {
    path: '/painel/admin', title: copy('Administração', 'Administration'), action: copy('Abrir administração', 'Open administration'), staff: true,
    tip: copy('Escolha o módulo administrativo desejado. Cada operação continua sujeita às permissões da sua função.', 'Choose the administration module you need. Each operation still requires the permissions assigned to your role.'),
    suggestion: copy('Como encontro as ferramentas disponíveis para minha função na equipe?', 'How do I find the tools available to my staff role?'), related: ['/painel/support'],
  },
]

const adminPages = new Set(['recursos', 'roadmap', 'apoiadores', 'comercio', 'recompensas', 'financeiro', 'itens', 'itens/customs', 'servidor', 'contas', 'servicos', 'moedas', 'loja', 'noticias', 'jogos', 'atendimento', 'temas'].map(path => `/painel/admin/${path}`))

function resolveTopic(path: string | null | undefined) {
  if (!path) return undefined
  const canonical = /^\/painel\/accounts\/[a-zA-Z0-9_-]+\/[0-9]+$/.test(path) ? '/painel/accounts' : adminPages.has(path) ? '/painel/admin' : path
  return topics.find(topic => topic.path === canonical)
}
function allowed(topic: Topic, user: HelpIdentity, resources: HelpResources | undefined) {
  return (!topic.staff || canAccessStaff(user)) && !resources?.some(resource => resource.code === topic.resource && !resource.enabled)
}
function actionAvailable(topic: Topic, user: HelpIdentity, resources: HelpResources | undefined) {
  return allowed(topic, user, resources) && (!topic.resource || resources !== undefined)
}

/** Local orientation for known panel routes; discards arbitrary URLs and private record identifiers.
 * Resource links wait for the resource catalogue; missing entries follow ResourceGate's enabled default.
 */
export function getHelpContext(path: string | null | undefined, user: HelpIdentity = null, resources?: HelpResources, language: HelpLanguage = 'pt'): HelpContext | null {
  const topic = resolveTopic(path)
  if (!topic || !allowed(topic, user, resources)) return null
  const related = [topic.path, ...(topic.related ?? [])]
  return {
    path: topic.path, title: topic.title[language], tip: topic.tip[language], suggestion: topic.suggestion[language],
    actions: related.flatMap(path => {
      const target = resolveTopic(path)
      return target && actionAvailable(target, user, resources) ? [{ to: target.path, label: target.action[language] }] : []
    }),
  }
}

/** Monta um chamado com assunto da tela atual; nunca inclui o histórico do chat. */
export function supportTicketPrefill(path: string | null | undefined, language: HelpLanguage = 'pt'): { to: string; label: string } | null {
  const context = getHelpContext(path, null, undefined, language)
  if (!context) return null
  const subject = language === 'pt' ? `Ajuda: ${context.title}` : `Help: ${context.title}`
  const params = new URLSearchParams({ subject, from: context.path })
  return {
    to: `/painel/support?${params.toString()}`,
    label: language === 'pt' ? 'Abrir chamado sobre esta tela' : 'Open a ticket about this screen',
  }
}

/** Turns only standalone, known relative paths in an answer into navigation links.
 * Never follows external URLs, query strings, fragments or links to individual records.
 */
export function getHelpActionsForText(text: string, user: HelpIdentity = null, resources?: HelpResources, language: HelpLanguage = 'pt'): HelpContext['actions'] {
  const result: HelpContext['actions'] = []
  // A path may be surrounded by prose punctuation or Markdown code delimiters, not a URL host.
  const paths = text.matchAll(/(?:^|[\s(`])(?<path>\/painel(?:\/[a-z]+)*)(?=$|[\s),.;!`])/g)
  for (const match of paths) {
    const topic = topics.find(candidate => candidate.path === match.groups?.path)
    if (!topic || !actionAvailable(topic, user, resources) || result.some(action => action.to === topic.path)) continue
    result.push({ to: topic.path, label: topic.action[language] })
    if (result.length === 3) break
  }
  return result
}
