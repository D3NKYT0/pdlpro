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
  tips: Copy[]
  suggestion: Copy
  action: Copy
  related?: string[]
  resource?: string
  staff?: boolean
}
const copy = (pt: string, en: string, es = en): Copy => ({ pt, en, es })

/** Stable tip-of-the-day index for a screen: same calendar day + path → same tip. */
export function dailyTipIndex(count: number, seed: string, now = new Date()) {
  if (count <= 0) return 0
  const day = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86_400_000)
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return Math.abs(day + hash) % count
}

// Navigation is selected here, never taken from a generated URL or a query parameter.
const topics: Topic[] = [
  {
    path: '/painel', title: copy('Painel', 'Dashboard'), action: copy('Abrir meu painel', 'Open my dashboard'),
    tips: [
      copy('Use o menu para consultar suas contas, acompanhar seu progresso e encontrar os recursos do servidor.', 'Use the menu to view your accounts, follow your progress and find server features.'),
      copy('Comece pelas contas vinculadas: com elas abertas, inventário, troca e comércio fazem mais sentido.', 'Start with linked accounts: once they are set, inventory, exchange and trading make more sense.'),
      copy('Avisos e atendimento ficam no menu — abra-os quando precisar de novidades ou da equipe.', 'Notifications and support live in the menu — open them when you need news or the team.'),
    ],
    suggestion: copy('Por onde começo no painel do PDL?', 'Where should I start in the PDL dashboard?'), related: ['/painel/accounts', '/painel/support'],
  },
  {
    path: '/painel/accounts', title: copy('Contas e personagens', 'Accounts and characters'), action: copy('Abrir minhas contas', 'Open my accounts'), resource: 'accounts',
    tips: [
      copy('Confira qual conta L2 está selecionada antes de abrir os personagens. O inventário usa as contas vinculadas ao seu perfil.', 'Check the selected L2 account before opening its characters. The inventory uses accounts linked to your profile.'),
      copy('Vincule só contas suas. Contas reivindicadas aparecem aqui e alimentam inventário, troca e comércio.', 'Link only accounts you own. Claimed accounts show up here and feed inventory, exchange and trading.'),
      copy('Se um personagem não aparece, confirme a conta selecionada e se o personagem existe nessa conta no jogo.', 'If a character is missing, confirm the selected account and that the character exists on that game account.'),
    ],
    suggestion: copy('Como encontro minhas contas L2 e meus personagens?', 'How do I find my L2 accounts and characters?'), related: ['/painel/inventory', '/painel/security'],
  },
  {
    path: '/painel/wallet', title: copy('Carteira', 'Wallet'), action: copy('Abrir minha carteira', 'Open my wallet'), resource: 'wallet',
    tips: [
      copy('Consulte o saldo, o histórico e o status do pedido na carteira. Confira o destinatário e a quantidade antes de confirmar uma transferência.', 'Check your balance, history and order status in the wallet. Check the recipient and amount before confirming a transfer.'),
      copy('Pedidos ficam com status até concluírem. Use o histórico para acompanhar compras e movimentos recentes.', 'Orders keep a status until they finish. Use history to track recent purchases and movements.'),
      copy('Para enviar moedas ao personagem, use a troca para o jogo e revise a prévia antes de confirmar.', 'To send coins to a character, use game exchange and review the preview before confirming.'),
    ],
    suggestion: copy('Como acompanho meu saldo e o status de uma compra de moedas?', 'How do I check my balance and the status of a coin purchase?'), related: ['/painel/wallet/pedidos', '/painel/wallet/extrato', '/painel/wallet/jogo', '/painel/support'],
  },
  {
    path: '/painel/wallet/pedidos', title: copy('Pedidos de recarga', 'Top-up orders'), action: copy('Abrir pedidos', 'Open orders'), resource: 'wallet',
    tips: [
      copy('A lista mostra seus pedidos de recarga com status e valor. Clique em um item para ver o detalhe completo.', 'The list shows your top-up orders with status and amount. Click an item for the full detail.'),
      copy('Use a paginação para navegar o histórico. Pedidos pendentes ficam visíveis até concluírem ou expirarem.', 'Use pagination to browse history. Pending orders stay visible until they finish or expire.'),
      copy('Volte à carteira para comprar novamente ou conferir o saldo creditado após o pagamento.', 'Return to the wallet to buy again or check the balance credited after payment.'),
    ],
    suggestion: copy('Como vejo o status e o detalhe de um pedido de moedas?', 'How do I see the status and detail of a coin order?'), related: ['/painel/wallet', '/painel/wallet/extrato', '/painel/support'],
  },
  {
    path: '/painel/wallet/extrato', title: copy('Extrato da carteira', 'Wallet statement'), action: copy('Abrir extrato', 'Open statement'), resource: 'wallet',
    tips: [
      copy('O extrato lista entradas e saídas da carteira. Clique em um movimento para ver origem, destino e data.', 'The statement lists wallet credits and debits. Click a movement to see origin, destination and date.'),
      copy('Use a paginação para percorrer o histórico completo além da prévia da carteira.', 'Use pagination to browse the full history beyond the wallet preview.'),
      copy('Transferências, compras e créditos de promoção aparecem aqui com o sinal do movimento.', 'Transfers, purchases and promo credits appear here with the movement sign.'),
    ],
    suggestion: copy('Como leio uma movimentação no extrato da carteira?', 'How do I read a movement on the wallet statement?'), related: ['/painel/wallet', '/painel/wallet/pedidos', '/painel/support'],
  },
  {
    path: '/painel/wallet/jogo', title: copy('Troca para o jogo', 'Game exchange'), action: copy('Abrir troca para o jogo', 'Open game exchange'), resource: 'wallet',
    tips: [
      copy('Selecione a conta e o personagem de destino e confira a prévia da troca antes de confirmar.', 'Select the destination account and character and review the exchange preview before confirming.'),
      copy('A prévia mostra quanto sai da carteira e o que chega no personagem — leia os dois lados.', 'The preview shows what leaves the wallet and what reaches the character — read both sides.'),
      copy('Sem conta ou personagem selecionados, a troca não segue. Resolva isso em Contas e personagens se precisar.', 'Without a selected account or character, exchange cannot proceed. Fix that under Accounts and characters if needed.'),
    ],
    suggestion: copy('Como confiro o destino e a prévia da troca para o jogo?', 'How do I check the destination and preview of a game exchange?'), related: ['/painel/accounts', '/painel/wallet'],
  },
  {
    path: '/painel/inventory', title: copy('Inventário', 'Inventory'), action: copy('Abrir meu inventário', 'Open my inventory'), resource: 'inventory',
    tips: [
      copy('Escolha a conta e o personagem para consultar os itens. As abas separam os itens dos personagens da mochila de recompensas.', 'Choose an account and character to view items. The tabs separate character items from the reward bag.'),
      copy('Itens de personagem e mochila de recompensas são listas diferentes — troque de aba se não achar o que procura.', 'Character items and the reward bag are different lists — switch tabs if you cannot find what you need.'),
      copy('Se a lista vier vazia, confira a conta selecionada e se o personagem está online ou sincronizado no servidor.', 'If the list is empty, check the selected account and whether the character is online or synced on the server.'),
    ],
    suggestion: copy('Qual é a diferença entre o inventário dos personagens e a mochila de recompensas?', 'What is the difference between character inventory and the reward bag?'), related: ['/painel/accounts', '/painel/support'],
  },
  {
    path: '/painel/shop', title: copy('Loja', 'Shop'), action: copy('Abrir a loja', 'Open the shop'), resource: 'shop',
    tips: [
      copy('Confira os itens, a quantidade e o total do carrinho antes de concluir a compra. Consulte a carteira para acompanhar suas moedas.', 'Check the items, quantities and cart total before completing a purchase. Visit the wallet to track your coins.'),
      copy('O total do carrinho usa o saldo da carteira. Sem saldo suficiente, complete a compra ou ajuste a quantidade.', 'The cart total uses your wallet balance. Without enough balance, finish funding or adjust quantities.'),
      copy('Depois da compra, itens e moedas aparecem no inventário e no histórico da carteira conforme o tipo do produto.', 'After purchase, items and coins show up in inventory and wallet history according to the product type.'),
    ],
    suggestion: copy('Como confiro os itens e o total da minha compra na loja?', 'How do I check the items and total of my shop purchase?'), related: ['/painel/wallet', '/painel/inventory'],
  },
  {
    path: '/painel/marketplace', title: copy('Marketplace', 'Marketplace'), action: copy('Abrir marketplace', 'Open marketplace'), resource: 'marketplace',
    tips: [
      copy('Compare o item, a quantidade e o preço do anúncio. Confira seu inventário antes de anunciar um item.', 'Compare the item, quantity and listing price. Check your inventory before listing an item.'),
      copy('Antes de comprar, leia o anúncio completo: vendedor, quantidade e preço unitário evitam surpresas.', 'Before buying, read the full listing: seller, quantity and unit price help avoid surprises.'),
      copy('Para anunciar, o item precisa estar disponível na conta/personagem certos — confira o inventário primeiro.', 'To list an item, it must be available on the right account/character — check inventory first.'),
    ],
    suggestion: copy('O que devo conferir antes de comprar ou anunciar no marketplace?', 'What should I check before buying or listing on the marketplace?'), related: ['/painel/inventory', '/painel/wallet'],
  },
  {
    path: '/painel/auctions', title: copy('Leilões', 'Auctions'), action: copy('Abrir leilões', 'Open auctions'), resource: 'auction',
    tips: [
      copy('Confira o item, o lance atual e o prazo do leilão antes de enviar um lance.', 'Check the item, current bid and auction deadline before placing a bid.'),
      copy('Lances usam saldo da carteira conforme as regras do leilão. Confira o valor mínimo e o tempo restante.', 'Bids use wallet balance according to auction rules. Check the minimum bid and time left.'),
      copy('Acompanhe o status depois do lance: se for superado ou vencer, a tela e a carteira refletem o resultado.', 'Follow status after bidding: if outbid or winning, the screen and wallet reflect the outcome.'),
    ],
    suggestion: copy('Como acompanho um leilão e confiro meu lance?', 'How do I follow an auction and check my bid?'), related: ['/painel/wallet', '/painel/support'],
  },
  {
    path: '/painel/games', title: copy('Jogos', 'Games'), action: copy('Abrir jogos', 'Open games'), resource: 'games',
    tips: [
      copy('Leia as regras e os custos exibidos em cada jogo. Consulte a mochila para acompanhar os itens recebidos.', 'Read the rules and costs shown for each game. Visit the bag to track received items.'),
      copy('Cada jogo mostra custo e recompensa na própria tela — confirme antes de jogar de novo.', 'Each game shows cost and reward on its own screen — confirm before playing again.'),
      copy('Prêmios costumam ir para a mochila de recompensas ou inventário; abra Jornada se estiver em missão.', 'Prizes usually go to the reward bag or inventory; open Journey if you are on a mission.'),
    ],
    suggestion: copy('Onde confiro as regras dos jogos e as recompensas recebidas?', 'Where do I check game rules and received rewards?'), related: ['/painel/inventory', '/painel/recompensas'],
  },
  {
    path: '/painel/recompensas', title: copy('Jornada e recompensas', 'Journey and rewards'), action: copy('Abrir minhas recompensas', 'Open my rewards'), resource: 'games',
    tips: [
      copy('Consulte as missões, os requisitos e as recompensas disponíveis. O progresso exibido na tela indica o que já foi registrado pelo sistema.', 'Check missions, requirements and available rewards. The progress shown on screen reflects what the system has recorded.'),
      copy('Só resgate o que estiver marcado como disponível. Requisitos incompletos bloqueiam o botão de propósito.', 'Only claim what is marked available. Incomplete requirements block the button on purpose.'),
      copy('Progresso e inventário andam juntos: após resgatar, confira a mochila se o item não aparecer na hora.', 'Progress and inventory go together: after claiming, check the bag if the item does not show up right away.'),
    ],
    suggestion: copy('Como acompanho as missões e resgato uma recompensa disponível?', 'How do I track missions and claim an available reward?'), related: ['/painel/inventory', '/painel/progress'],
  },
  {
    path: '/painel/apoiadores', title: copy('Apoiadores', 'Supporters'), action: copy('Abrir área de apoiadores', 'Open supporters area'), resource: 'supporters',
    tips: [
      copy('Acompanhe o status do seu cadastro, os cupons e as comissões disponíveis nesta área.', 'Track your application status, coupons and available commissions in this area.'),
      copy('Cupons e comissões só aparecem depois que o cadastro for aprovado e houver indicações válidas.', 'Coupons and commissions only appear after approval and valid referrals.'),
      copy('Dúvidas sobre pagamento ou status do apoiador? Abra um chamado no Atendimento com o contexto desta tela.', 'Questions about payout or supporter status? Open a Support ticket with this screen as context.'),
    ],
    suggestion: copy('Como acompanho meu cadastro e minhas comissões de apoiador?', 'How do I track my supporter application and commissions?'), related: ['/painel/support'],
  },
  {
    path: '/painel/profile', title: copy('Meu perfil', 'My profile'), action: copy('Abrir meu perfil', 'Open my profile'), resource: 'profile',
    tips: [
      copy('Atualize os dados de apresentação do seu perfil. As opções de acesso ficam em Conta e segurança.', 'Update your profile presentation details. Sign-in options are under Account and security.'),
      copy('Nome e foto de apresentação não alteram login nem senha — isso fica em Conta e segurança.', 'Display name and avatar do not change login or password — those live under Account and security.'),
      copy('Depois de salvar, o painel usa os dados novos nas próximas telas da sessão.', 'After saving, the panel uses the new details on the next screens in this session.'),
    ],
    suggestion: copy('Como atualizo meu perfil e encontro as opções de segurança?', 'How do I update my profile and find security options?'), related: ['/painel/security'],
  },
  {
    path: '/painel/security', title: copy('Conta e segurança', 'Account and security'), action: copy('Abrir segurança da conta', 'Open account security'),
    tips: [
      copy('Consulte os métodos de acesso e as sessões da sua conta. Nunca envie senhas ou códigos de autenticação no chat.', 'Review your account sign-in methods and sessions. Never share passwords or authentication codes in chat.'),
      copy('Revogue sessões que não reconhece. A sessão atual pode exigir novo login ao sair.', 'Revoke sessions you do not recognize. The current session may require signing in again when you leave.'),
      copy('Trocas de senha e vínculos de login ficam aqui — confirme o e-mail e o método antes de salvar.', 'Password changes and login links live here — confirm email and method before saving.'),
    ],
    suggestion: copy('Como reviso as opções de segurança da minha conta?', 'How do I review my account security options?'), related: ['/painel/support'],
  },
  {
    path: '/painel/progress', title: copy('Progresso', 'Progress'), action: copy('Abrir meu progresso', 'Open my progress'), resource: 'progress',
    tips: [
      copy('Consulte suas conquistas e o progresso registrado. Os requisitos de cada objetivo ajudam a escolher o próximo passo.', 'Check your achievements and recorded progress. Each goal’s requirements can help you choose your next step.'),
      copy('Conquistas completas e em andamento aparecem com requisitos claros — use-os para priorizar o próximo objetivo.', 'Completed and in-progress achievements show clear requirements — use them to pick the next goal.'),
      copy('Parte do progresso também aparece em Jornada e recompensas quando houver missão ligada.', 'Some progress also shows under Journey and rewards when a linked mission exists.'),
    ],
    suggestion: copy('Como acompanho meu progresso e minhas conquistas no PDL?', 'How do I track my progress and achievements in PDL?'), related: ['/painel/recompensas'],
  },
  {
    path: '/painel/notifications', title: copy('Avisos', 'Notifications'), action: copy('Abrir meus avisos', 'Open my notifications'), resource: 'notifications',
    tips: [
      copy('Consulte os avisos recebidos e marque os que já leu. Para conversar com a equipe, abra o Atendimento.', 'Review received notifications and mark the ones you have read. Open Support to talk to the team.'),
      copy('Avisos não lidos ficam em destaque. Marque como lido para limpar a lista sem apagar o histórico.', 'Unread notices stay highlighted. Mark as read to clear the list without deleting history.'),
      copy('Se um aviso pedir ação da equipe, abra o Atendimento e cite o assunto do aviso.', 'If a notice needs staff action, open Support and mention the notice subject.'),
    ],
    suggestion: copy('Como acompanho os avisos e entro em contato com a equipe?', 'How do I follow notifications and contact the team?'), related: ['/painel/support'],
  },
  {
    path: '/painel/support', title: copy('Atendimento', 'Support'), action: copy('Ir ao atendimento', 'Contact the team'), resource: 'support',
    tips: [
      copy('Descreva o que aconteceu e a tela envolvida no chamado. Acompanhe as respostas da equipe no mesmo atendimento.', 'Describe what happened and which screen was involved in your ticket. Follow team replies in the same support conversation.'),
      copy('Inclua horário aproximado, personagem/conta e o que já tentou — isso acelera a resposta da equipe.', 'Include approximate time, character/account and what you already tried — that speeds up the team reply.'),
      copy('Não envie senhas ou códigos no chamado. A equipe nunca pede esses dados pelo chat.', 'Never send passwords or codes in a ticket. Staff never ask for those in chat.'),
    ],
    suggestion: copy('Como abro e acompanho um chamado para a equipe?', 'How do I open and follow a support ticket?'), related: ['/painel/notifications'],
  },
  {
    path: '/painel/ajuda', title: copy('Ajuda', 'Help'), action: copy('Abrir a ajuda', 'Open help'), resource: 'help',
    tips: [
      copy('Converse com o Denkynho sobre a tela em que você está. As respostas usam o contexto do painel e do handbook.', 'Chat with Denkynho about the screen you are on. Answers use panel context and the handbook.'),
      copy('Prefira perguntas objetivas. Se precisar da equipe humana, abra um chamado no Atendimento.', 'Prefer clear questions. If you need the human team, open a Support ticket.'),
      copy('O cantinho do mascote continua disponível mesmo quando só a conversa de ajuda estiver em pausa.', 'The pet corner can stay available even when only the help chat is paused.'),
    ],
    suggestion: copy('Como uso a ajuda do Denkynho nesta tela?', 'How do I use Denkynho help on this screen?'), related: ['/painel/support'],
  },
  {
    path: '/painel/admin', title: copy('Administração', 'Administration', 'Administración'), action: copy('Abrir administração', 'Open administration', 'Abrir administración'), staff: true,
    tips: [
      copy(
        'Escolha o módulo administrativo desejado. Cada operação continua sujeita às permissões da sua função.',
        'Choose the administration module you need. Each operation still requires the permissions assigned to your role.',
        'Elige el módulo administrativo deseado. Cada operación sigue sujeta a los permisos de tu función.',
      ),
      copy(
        'Módulos ocultos ou bloqueados indicam falta de permissão — peça acesso à função correta se precisar.',
        'Hidden or blocked modules mean missing permission — ask for the right role if you need access.',
        'Los módulos ocultos o bloqueados indican falta de permiso: pide acceso a la función correcta si lo necesitas.',
      ),
      copy(
        'Alterações administrativas têm efeito imediato. Confirme filtros e o registro certo antes de salvar.',
        'Admin changes take effect immediately. Confirm filters and the right record before saving.',
        'Los cambios administrativos tienen efecto inmediato. Confirma los filtros y el registro correcto antes de guardar.',
      ),
    ],
    suggestion: copy(
      'Como encontro as ferramentas disponíveis para minha função na equipe?',
      'How do I find the tools available to my staff role?',
      '¿Cómo encuentro las herramientas disponibles para mi función en el equipo?',
    ), related: ['/painel/support'],
  },
]

const adminPages = new Set(['recursos', 'roadmap', 'apoiadores', 'comercio', 'recompensas', 'relatorios', 'financeiro', 'itens', 'itens/customs', 'servidor', 'contas', 'servicos', 'moedas', 'loja', 'noticias', 'jogos', 'atendimento', 'temas'].map(path => `/painel/admin/${path}`))

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
 * `tip` is the tip-of-the-day for that screen (stable for the calendar day).
 */
export function getHelpContext(path: string | null | undefined, user: HelpIdentity = null, resources?: HelpResources, language: HelpLanguage = 'pt', now = new Date()): HelpContext | null {
  const topic = resolveTopic(path)
  if (!topic || !allowed(topic, user, resources)) return null
  const related = [topic.path, ...(topic.related ?? [])]
  const tip = topic.tips[dailyTipIndex(topic.tips.length, topic.path, now)][language]
  return {
    path: topic.path, title: topic.title[language], tip, suggestion: topic.suggestion[language],
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
  const subject = language === 'pt' ? `Ajuda: ${context.title}` : language === 'es' ? `Ayuda: ${context.title}` : `Help: ${context.title}`
  const params = new URLSearchParams({ subject, from: context.path })
  return {
    to: `/painel/support?${params.toString()}`,
    label: language === 'pt' ? 'Abrir chamado sobre esta tela' : language === 'es' ? 'Abrir ticket sobre esta pantalla' : 'Open a ticket about this screen',
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
