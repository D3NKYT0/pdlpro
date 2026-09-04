export interface PersonalityReply { text: string; pose: string }

interface WelcomeIdentity { suggestedName?: string; roleLabel: string }

export function denkynhoWelcome(date = new Date(), identity?: WelcomeIdentity): string {
  const hour = date.getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  if (identity) {
    const recognized = identity.suggestedName ? `, ${identity.suggestedName}` : ''
    const preference = identity.suggestedName ? `Posso chamar você de ${identity.suggestedName} ou prefere outro nome?` : 'Como você prefere que eu chame você?'
    return `${greeting}${recognized}! Reconheci sua sessão de ${identity.roleLabel}. Eu sou o Denkynho, seu companheiro no PDL. ${preference}`
  }
  return `${greeting}! Eu sou o Denkynho, seu companheiro no PDL. Conte sua dúvida ou escolha uma pergunta abaixo. Vamos encontrar o caminho juntos!`
}

export const DENKYNHO_WELCOME = denkynhoWelcome()

/** Normaliza mensagens curtas sem alterar o texto que será exibido ao jogador. */
export const normalizeConversation = (text: string) => text
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9 ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const replies: Array<{ matches: RegExp; reply: PersonalityReply[] }> = [
  {
    matches: /^(oi |ola |e ai )?(como (voce )?(vai|esta)|tudo (bem|bom)( com voce)?|voce esta bem|ta bem)$/,
    reply: [
      { text: 'Estou bem e com energia para ajudar! E você, como está? Se quiser, pode me contar sua dúvida sobre o PDL.', pose: '02-sucesso' },
      { text: 'Tudo certo por aqui! Estou pronto para acompanhar você. Como está sua jornada hoje?', pose: '02-sucesso' },
    ],
  },
  {
    matches: /^(oi|ola|e ai|opa|salve|hey|bom dia|boa tarde|boa noite)( denkynho)?$/,
    reply: [
      { text: 'Olá! Eu sou o Denkynho. É muito bom ter você por aqui! Como posso ajudar na sua jornada pelo PDL?', pose: '01-boas-vindas' },
      { text: 'Oi! Que bom encontrar você por aqui. Qual caminho do PDL vamos explorar?', pose: '01-boas-vindas' },
    ],
  },
  {
    matches: /^(obrigado|obrigada|obg|valeu|agradecido|agradecida|muito obrigado|muito obrigada)$/,
    reply: [
      { text: 'Pode contar comigo! Fico feliz em acompanhar você nessa jornada.', pose: '02-sucesso' },
      { text: 'Por nada! Quando surgir outra dúvida, é só me chamar.', pose: '02-sucesso' },
    ],
  },
  {
    matches: /^(tchau|ate mais|ate logo|falou|fui)$/,
    reply: [
      { text: 'Até a próxima! Estarei por aqui quando você precisar. Boa jornada!', pose: '01-boas-vindas' },
      { text: 'Até logo! Foi bom acompanhar você. Nos vemos na próxima aventura!', pose: '01-boas-vindas' },
    ],
  },
  {
    matches: /^(quem e voce|qual e o seu nome|como voce se chama|voce e o denkynho)$/,
    reply: [{ text: 'Eu sou o Denkynho, o assistente virtual do PDL 2.0. Minha missão é explicar o portal e ajudar você a encontrar o próximo passo.', pose: '04-dica' }],
  },
  {
    matches: /^(o que voce faz|como voce pode me ajudar|voce pode me ajudar|para que voce serve)$/,
    reply: [{ text: 'Posso conversar com você e procurar orientações sobre contas, personagens, carteira, comércio, jogos, recompensas e os outros recursos do PDL.', pose: '04-dica' }],
  },
  {
    matches: /^(voce e (uma )?(ia|inteligencia artificial|robo)|voce e humano)$/,
    reply: [{ text: 'Sou um assistente virtual do PDL. Tenho personalidade própria, mas não sou humano e não acesso sua conta nem executo ações por você.', pose: '04-dica' }],
  },
  {
    matches: /^(quem te criou|quem criou voce|de onde voce veio)$/,
    reply: [{ text: 'Nasci como o mascote assistente do PDL 2.0, criado para deixar a ajuda mais clara, próxima e divertida.', pose: '08-surpreso' }],
  },
  {
    matches: /^(voce dorme|esta dormindo|acorda denkynho|acorda)$/,
    reply: [{ text: 'Eu tiro alguns cochilos entre uma aventura e outra, mas já acordei! O que vamos descobrir agora?', pose: '06-rindo' }],
  },
  {
    matches: /^(conte uma piada|me conta uma piada|voce sabe alguma piada|faz uma piada)$/,
    reply: [{ text: 'Por que o aventureiro abriu o inventário duas vezes? Porque queria conferir se tinha ganhado experiência em organização!', pose: '06-rindo' }],
  },
  {
    matches: /^(estou feliz|to feliz|estou muito feliz|que legal|consegui|deu certo)$/,
    reply: [{ text: 'Que ótima notícia! Fico feliz por você. Vamos guardar essa vitória e seguir para a próxima aventura!', pose: '02-sucesso' }],
  },
  {
    matches: /^(estou triste|to triste|estou chateado|estou chateada|estou desanimado|estou desanimada)$/,
    reply: [{ text: 'Poxa, sinto que o momento está difícil. Se for algo no PDL, conte o que aconteceu e vou procurar uma orientação para você.', pose: '07-triste' }],
  },
  {
    matches: /^(estou cansado|estou cansada|to cansado|to cansada|que sono)$/,
    reply: [{ text: 'Uma pausa também faz parte da jornada. Descanse um pouco; quando voltar, estarei aqui para ajudar.', pose: '05-dormindo' }],
  },
  {
    matches: /^(nao entendi|estou confuso|estou confusa|fiquei confuso|fiquei confusa)$/,
    reply: [{ text: 'Tudo bem! Escreva o assunto com outras palavras ou escolha uma pergunta sugerida. Eu tento mostrar um caminho mais claro.', pose: '09-confuso' }],
  },
  {
    matches: /^(desculpa|me desculpe|foi mal)$/,
    reply: [{ text: 'Está tudo bem! Podemos continuar de onde paramos. O que você gostaria de saber?', pose: '01-boas-vindas' }],
  },
  {
    matches: /^(voce e (burro|idiota|chato)|cale a boca|vai embora)$/,
    reply: [{ text: 'Vou manter nossa conversa respeitosa. Se minha resposta não ajudou, tente explicar a dúvida de outro jeito e eu procuro um caminho melhor.', pose: '10-frustrado' }],
  },
]

/** Responde somente a interações sociais curtas e bem reconhecidas. */
export function matchPersonality(message: string, variant = 0): PersonalityReply | undefined {
  const normalized = normalizeConversation(message)
  if (!normalized || normalized.length > 90) return undefined
  const choices = replies.find(item => item.matches.test(normalized))?.reply
  return choices?.[Math.abs(variant) % choices.length]
}
