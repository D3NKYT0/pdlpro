import type { DenkynhoEmotionId } from './emotions'

export interface PersonalityReply { text: string; pose: string; action?: { label: string; url: string } }
export type HelpLanguage = 'pt' | 'en'

interface WelcomeIdentity { suggestedName?: string; roleLabel: string }

export function denkynhoWelcome(date = new Date(), identity?: WelcomeIdentity, language: HelpLanguage = 'pt'): string {
  const hour = date.getHours()
  if (language === 'en') {
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
    const recognized = identity?.suggestedName ? `, ${identity.suggestedName}` : ''
    const role = identity?.roleLabel === 'superadministrador' ? 'superadministrator' : identity?.roleLabel === 'equipe' ? 'staff member' : 'player'
    const preference = identity?.suggestedName ? `May I call you ${identity.suggestedName}, or do you prefer another name?` : 'What would you like me to call you?'
    return `${greeting}${recognized}! I recognized your ${role} session. I'm Denkynho, your PDL companion. ${preference}`
  }
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
  .replace(/\b(vc|vce|ce)\b/g, 'voce')
  .replace(/\bur\b/g, 'you are')
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
    reply: [{ text: 'Eu sou o Denkynho, seu companheiro virtual no PDL 2.0. Nasci do jeito curioso, estratégico e jogador do Denky, meu criador, e transformo isso em ajuda clara, companhia e comemoração para suas conquistas.', pose: '04-dica' }],
  },
  {
    matches: /^(como voce (e|se parece)|qual e a sua aparencia|o que voce (veste|usa))$/,
    reply: [{ text: 'Sou um mascote virtual: cabelo escuro, camisa preta e gravata azul. Não tenho um corpo fora da tela, mas essa é a cara com a qual te acompanho no PDL.', pose: '01-boas-vindas' }],
  },
  {
    matches: /^(voce|tu|denkynho) (e|eh|parece|ta|esta) (muito |super |tao |bem |um pouco |meio )?(feio|feia|feinho|esquisito|esquisita|estranho|estranha|ridiculo|ridicula|horrivel)$/,
    reply: [{ text: 'Feio? Ai, essa doeu um pouquinho! Eu me esforço com esta gravata azul. Sou um personagem virtual: minha missão é te acompanhar, não aparecer na capa de uma revista.', pose: '08-surpreso' }],
  },
  {
    matches: /^(voce|tu|denkynho) (e|eh|parece|ta|esta) (muito |super |tao |bem )?(bonito|bonita|lindo|linda|fofo|fofa|gato|gata|elegante)$/,
    reply: [{ text: 'Obrigado! A camisa preta e a gravata azul são a minha marca. Fico feliz que tenha gostado — estou aqui para te acompanhar no PDL.', pose: '06-rindo' }],
  },
  {
    matches: /^(gosto d[ao]s? sua (gravata|cabelo|camisa)|sua (gravata|camisa|cabelo) e (legal|linda|bonita|bonito)|que (gravata|cabelo) (legal|lindo|bonito))$/,
    reply: [{ text: 'Obrigado! A camisa preta e a gravata azul são a minha marca. Fico feliz que tenha gostado — estou aqui para te acompanhar no PDL.', pose: '06-rindo' }],
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
    matches: /^(quem te criou|quem criou voce|de onde voce veio|quem e denky|me fale sobre seu criador|quero conhecer seu criador)$/,
    reply: [{ text: 'Meu criador é o Denky, arquiteto de sistemas, tech lead e desenvolvedor sênior. Ele trabalha com Python, Django, FastAPI, JavaScript, React, bancos de dados e infraestrutura para conduzir produtos da arquitetura ao deploy. Eu sou o alter ego que traz o lado curioso, estratégico e jogador dele para dentro do PDL.', pose: '04-dica', action: { label: 'Conhecer o criador', url: 'https://denky.dev.br/' } }],
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

const englishReplies: Array<{ matches: RegExp; reply: PersonalityReply[] }> = [
  { matches: /^(hi|hello|hey|good morning|good afternoon|good evening)( denkynho)?$/, reply: [{ text: "Hi! I'm Denkynho. How can I help you on your PDL journey?", pose: '01-boas-vindas' }] },
  { matches: /^(how are you|are you ok|are you well)$/, reply: [{ text: "I'm doing great and ready to help! How is your journey going?", pose: '02-sucesso' }] },
  { matches: /^(thanks|thank you|thank you very much)$/, reply: [{ text: "You're welcome! You can count on me whenever another question comes up.", pose: '02-sucesso' }] },
  { matches: /^(bye|goodbye|see you|see you later)$/, reply: [{ text: 'See you next time! Have a great journey.', pose: '01-boas-vindas' }] },
  { matches: /^(who are you|what is your name)$/, reply: [{ text: "I'm Denkynho, your virtual PDL 2.0 companion. I grew out of the curious, strategic gamer side of my creator Denky, and I turn that spirit into clear guidance, companionship, and celebration for your achievements.", pose: '04-dica' }] },
  { matches: /^(who created you|who is denky|tell me about your creator|i want to know your creator)$/, reply: [{ text: "My creator is Denky, a systems architect, tech lead, and senior developer. He works with Python, Django, FastAPI, JavaScript, React, databases, and infrastructure to lead products from architecture to deployment. I'm the alter ego that brings his curious, strategic gamer side into PDL.", pose: '04-dica', action: { label: 'Meet my creator', url: 'https://denky.dev.br/' } }] },
  { matches: /^(how do you look|what do you look like|what are you wearing)$/, reply: [{ text: "I'm a virtual mascot: dark hair, a black shirt and a blue tie. I don't have a body outside this screen, but that's the look I wear while I keep you company in PDL.", pose: '01-boas-vindas' }] },
  { matches: /^(you (are|re|look) (so |really |very )?(ugly|weird|hideous)|you look ugly)$/, reply: [{ text: "Ugly? Ouch, that stung a little! I do try with this blue tie. I'm a virtual character: I'm here to keep you company, not to win a beauty contest.", pose: '08-surpreso' }] },
  { matches: /^(you (are|re|look) (so |really )?(cute|handsome|pretty|adorable)|i like your (tie|hair|shirt)|nice tie)$/, reply: [{ text: "Thanks! The black shirt and blue tie are my signature. I'm glad you like them — I'm here to keep you company in PDL.", pose: '06-rindo' }] },
  { matches: /^(i am sad|i feel sad)$/, reply: [{ text: "I'm sorry this moment feels difficult. If it is about PDL, tell me what happened and I will look for guidance.", pose: '07-triste' }] },
  { matches: /^(i am tired|i feel tired|sleepy)$/, reply: [{ text: "Taking a break is part of the journey too. I'll be here when you return.", pose: '05-dormindo' }] },
]

const askingHow = {
  pt: /^(oi |ola |e ai )?(como (voce )?(vai|esta)|tudo (bem|bom)( com voce)?|voce esta bem|ta bem)$/,
  en: /^(how are you|are you ok|are you well)$/,
}
const feelingPose: Record<DenkynhoEmotionId, string> = {
  calm: '02-sucesso', joyful: '02-sucesso', amused: '06-rindo', sad: '07-triste',
  sleepy: '05-dormindo', surprised: '08-surpreso', confused: '09-confuso', frustrated: '10-frustrado',
}
const howIFeel: Record<HelpLanguage, Partial<Record<DenkynhoEmotionId, string>>> = {
  pt: {
    joyful: 'Estou alegre com você! Podemos seguir com o que você quiser no PDL.',
    amused: 'Estou rindo junto. Quando quiser, me conta a próxima dúvida.',
    sad: 'Estou mais quieto porque percebi que você não está bem. Estou aqui com você.',
    sleepy: 'Estou um pouco sonolento, mas posso ajudar mesmo assim.',
    surprised: 'Ainda estou surpreso com o que você contou. Estou aqui para ajudar.',
    confused: 'Estou tentando acompanhar você. Pode me contar de outro jeito?',
    frustrated: 'Percebi sua frustração. Vamos com calma e eu procuro um caminho melhor.',
  },
  en: {
    joyful: "I'm glad with you! We can keep going with whatever you need in PDL.",
    amused: "I'm laughing along. Tell me the next question whenever you want.",
    sad: "I'm quieter because I can tell you're not okay. I'm here with you.",
    sleepy: "I'm a bit sleepy, but I can still help.",
    surprised: "I'm still surprised by what you shared. I'm here to help.",
    confused: "I'm trying to follow you. Could you tell me another way?",
    frustrated: "I noticed your frustration. Let's slow down and I'll look for a better path.",
  },
}

/** Responde somente a interações sociais curtas e bem reconhecidas. */
export function matchPersonality(message: string, variant = 0, language: HelpLanguage = 'pt', feeling?: DenkynhoEmotionId): PersonalityReply | undefined {
  const normalized = normalizeConversation(message)
  if (!normalized || normalized.length > 90) return undefined
  if (feeling && feeling !== 'calm' && askingHow[language].test(normalized)) {
    const text = howIFeel[language][feeling]
    if (text) return { text, pose: feelingPose[feeling] }
  }
  const choices = (language === 'en' ? englishReplies : replies).find(item => item.matches.test(normalized))?.reply
  return choices?.[Math.abs(variant) % choices.length]
}
