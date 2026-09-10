/**
 * Intent catalog for Denkynho social replies.
 * Reply texts live in i18n locales personality.json; keep poses/matchers here.
 */
export type HelpLanguage = 'pt' | 'en' | 'es'

export interface PersonalityIntent {
  id: string
  matches: Partial<Record<HelpLanguage, RegExp>>
  /** Pose per reply variant; length must match replies array in JSON. */
  poses: string[]
  actionUrl?: string
}

/** Order matters: first matching intent wins. */
export const PERSONALITY_INTENTS: PersonalityIntent[] = [
  {
    id: 'howAreYou',
    matches: {
      pt: /^(oi |ola |e ai )?(como (voce )?(vai|esta)|tudo (bem|bom)( com voce)?|voce esta bem|ta bem)$/,
      en: /^(how are you|are you ok|are you well)$/,
      es: /^(como (estas|te va)|todo bien|estas bien|que tal)$/,
    },
    poses: ['02-sucesso', '02-sucesso'],
  },
  {
    id: 'greeting',
    matches: {
      pt: /^(oi|ola|e ai|opa|salve|hey|bom dia|boa tarde|boa noite)( denkynho)?$/,
      en: /^(hi|hello|hey|good morning|good afternoon|good evening)( denkynho)?$/,
      es: /^(hola|hey|buenos dias|buenas tardes|buenas noches)( denkynho)?$/,
    },
    poses: ['01-boas-vindas', '01-boas-vindas'],
  },
  {
    id: 'thanks',
    matches: {
      pt: /^(obrigado|obrigada|obg|valeu|agradecido|agradecida|muito obrigado|muito obrigada)$/,
      en: /^(thanks|thank you|thank you very much)$/,
      es: /^(gracias|muchas gracias|mil gracias)$/,
    },
    poses: ['02-sucesso', '02-sucesso'],
  },
  {
    id: 'bye',
    matches: {
      pt: /^(tchau|ate mais|ate logo|falou|fui)$/,
      en: /^(bye|goodbye|see you|see you later)$/,
      es: /^(adios|hasta luego|hasta pronto|chao)$/,
    },
    poses: ['01-boas-vindas', '01-boas-vindas'],
  },
  {
    id: 'whoAreYou',
    matches: {
      pt: /^(quem e voce|qual e o seu nome|como voce se chama|voce e o denkynho)$/,
      en: /^(who are you|what is your name)$/,
      es: /^(quien eres|como te llamas|cual es tu nombre)$/,
    },
    poses: ['04-dica'],
  },
  {
    id: 'appearance',
    matches: {
      pt: /^(como voce (e|se parece)|qual e a sua aparencia|o que voce (veste|usa))$/,
      en: /^(how do you look|what do you look like|what are you wearing)$/,
      es: /^(como te ves|como eres|que ropa usas)$/,
    },
    poses: ['01-boas-vindas'],
  },
  {
    id: 'insultUgly',
    matches: {
      pt: /^(voce|tu|denkynho) (e|eh|parece|ta|esta) (muito |super |tao |bem |um pouco |meio )?(feio|feia|feinho|esquisito|esquisita|estranho|estranha|ridiculo|ridicula|horrivel)$/,
      en: /^(you (are|re|look) (so |really |very )?(ugly|weird|hideous)|you look ugly)$/,
      es: /^(eres|estas|pareces) (muy |super )?(feo|rara|raro|horrible)$/,
    },
    poses: ['08-surpreso'],
  },
  {
    id: 'complimentLooks',
    matches: {
      pt: /^(voce|tu|denkynho) (e|eh|parece|ta|esta) (muito |super |tao |bem )?(bonito|bonita|lindo|linda|fofo|fofa|gato|gata|elegante)$/,
      en: /^(you (are|re|look) (so |really )?(cute|handsome|pretty|adorable))$/,
      es: /^(eres|estas|pareces) (muy |super )?(bonito|bonita|lindo|linda|mono|mona)$/,
    },
    poses: ['06-rindo'],
  },
  {
    id: 'likeOutfit',
    matches: {
      pt: /^(gosto d[ao]s? sua (gravata|cabelo|camisa)|sua (gravata|camisa|cabelo) e (legal|linda|bonita|bonito)|que (gravata|cabelo) (legal|lindo|bonito))$/,
      en: /^(i like your (tie|hair|shirt)|nice tie)$/,
      es: /^(me gusta tu (corbata|pelo|camisa)|que (corbata|pelo) (bonita|bonito|genial))$/,
    },
    poses: ['06-rindo'],
  },
  {
    id: 'loveYou',
    matches: {
      pt: /^(te amo|amo voce|gosto( muito)? de voce|voce e (legal|querido|querida|bacana|gente boa))$/,
      en: /^(i love you|i like you|you are (nice|kind|sweet))$/,
      es: /^(te quiero|te amo|me gustas|eres (amable|genial|dulce))$/,
    },
    poses: ['06-rindo'],
  },
  {
    id: 'missedYou',
    matches: {
      pt: /^(senti sua falta|sentir sua falta|estava com saudade|saudades|voltei)$/,
      en: /^(i missed you|missed you|i am back|i m back)$/,
      es: /^(te extrane|te eche de menos|volvi|estoy de vuelta)$/,
    },
    poses: ['01-boas-vindas'],
  },
  {
    id: 'cheerUp',
    matches: {
      pt: /^(me anima|me motiva|me da uma forca|preciso de (incentivo|motivacao))$/,
      en: /^(cheer me up|motivate me|give me a boost|i need encouragement)$/,
      es: /^(animame|motivame|necesito animo|dame animo)$/,
    },
    poses: ['02-sucesso'],
  },
  {
    id: 'friends',
    matches: {
      pt: /^(somos amigos|quero ser seu amigo|voce e meu amigo)$/,
      en: /^(we are friends|be my friend|you are my friend)$/,
      es: /^(somos amigos|quiero ser tu amigo|eres mi amigo)$/,
    },
    poses: ['02-sucesso'],
  },
  {
    id: 'age',
    matches: {
      pt: /^(quantos anos (voce )?tem|voce tem quantos anos|qual (e )?sua idade)$/,
      en: /^(how old are you|what is your age|how old is denkynho)$/,
      es: /^(cuantos anos tienes|que edad tienes)$/,
    },
    poses: ['04-dica'],
  },
  {
    id: 'favoriteColor',
    matches: {
      pt: /^(qual (e )?sua cor favorita|do que voce gosta|o que voce gosta)$/,
      en: /^(what is your favorite color|what do you like|what do you enjoy)$/,
      es: /^(cual es tu color favorito|que te gusta)$/,
    },
    poses: ['06-rindo'],
  },
  {
    id: 'canYouSeeMe',
    matches: {
      pt: /^(voce me (ve|escuta|ouve|conhece)|voce sabe (quem eu sou|meu saldo|minha senha))$/,
      en: /^(can you (see|hear) me|do you know (me|my balance|my password))$/,
      es: /^(me (ves|oyes|conoces)|sabes (quien soy|mi saldo|mi contrasena))$/,
    },
    poses: ['04-dica'],
  },
  {
    id: 'justChat',
    matches: {
      pt: /^(so quero conversar|vamos so conversar|nao quero ajuda( agora)?)$/,
      en: /^(i just want to (chat|talk)|lets just (chat|talk)|i do not want help( now)?)$/,
      es: /^(solo quiero (hablar|conversar)|no quiero ayuda( ahora)?)$/,
    },
    poses: ['01-boas-vindas'],
  },
  {
    id: 'youRock',
    matches: {
      pt: /^(voce e (demais|top|fera)|manda bem|arrasa)$/,
      en: /^(you rock|you are awesome|well done|nice job)$/,
      es: /^(eres (genial|increible)|bien hecho|que bien)$/,
    },
    poses: ['02-sucesso'],
  },
  {
    id: 'laugh',
    matches: {
      pt: /^(kkk+|haha+|rsrs+|boa essa|foi engra(c|cad)o|que engra(c|cad)o)$/,
      en: /^(haha+|lol|lmao|that was funny|funny)$/,
      es: /^(jaja+|jeje+|que gracioso|fue gracioso)$/,
    },
    poses: ['06-rindo'],
  },
  {
    id: 'whatCanYouDo',
    matches: {
      pt: /^(o que voce faz|como voce pode me ajudar|voce pode me ajudar|para que voce serve)$/,
      en: /^(what can you do|how can you help|what do you do)$/,
      es: /^(que haces|como puedes ayudarme|para que sirves)$/,
    },
    poses: ['04-dica'],
  },
  {
    id: 'areYouAI',
    matches: {
      pt: /^(voce e (uma )?(ia|inteligencia artificial|robo)|voce e humano)$/,
      en: /^(are you (an )?(ai|artificial intelligence|robot|human)|you are (an )?(ai|robot))$/,
      es: /^(eres (una )?(ia|inteligencia artificial|robot)|eres humano)$/,
    },
    poses: ['04-dica'],
  },
  {
    id: 'creator',
    matches: {
      pt: /^(quem te criou|quem criou voce|de onde voce veio|quem e denky|me fale sobre seu criador|quero conhecer seu criador)$/,
      en: /^(who created you|who is denky|tell me about your creator|i want to know your creator)$/,
      es: /^(quien te creo|quien es denky|hablame de tu creador|quiero conocer a tu creador)$/,
    },
    poses: ['04-dica'],
    actionUrl: 'https://denky.dev.br/',
  },
  {
    id: 'sleep',
    matches: {
      pt: /^(voce dorme|esta dormindo|acorda denkynho|acorda)$/,
      en: /^(do you sleep|are you sleeping|wake up)$/,
      es: /^(duermes|estas dormido|despierta)$/,
    },
    poses: ['06-rindo'],
  },
  {
    id: 'joke',
    matches: {
      pt: /^(conte uma piada|me conta uma piada|voce sabe alguma piada|faz uma piada)$/,
      en: /^(tell (me )?a joke|do you know a joke|make a joke)$/,
      es: /^(cuenta un chiste|sabes un chiste|haz un chiste)$/,
    },
    poses: ['06-rindo'],
  },
  {
    id: 'happy',
    matches: {
      pt: /^(estou feliz|to feliz|estou muito feliz|que legal|consegui|deu certo)$/,
      en: /^(i am (so )?happy|i feel great|it worked|i did it)$/,
      es: /^(estoy feliz|que bien|lo logre|salio bien)$/,
    },
    poses: ['02-sucesso'],
  },
  {
    id: 'sad',
    matches: {
      pt: /^(estou triste|to triste|estou chateado|estou chateada|estou desanimado|estou desanimada|fiquei triste|me deixou triste)$/,
      en: /^(i am sad|i feel sad)$/,
      es: /^(estoy triste|me siento triste|estoy desanimado)$/,
    },
    poses: ['07-triste'],
  },
  {
    id: 'rudeApology',
    matches: {
      pt: /^(grosso( me deixou triste)?|foi grosso|voce (foi grosso|me deixou triste)|que grosso|me deixou triste|foi mal da sua parte)( kk+| haha+| rsrs+)?$/,
      en: /^(you made me sad|that was rude|you were rude)$/,
      es: /^(fuiste grosero|eso fue grosero|me pusiste triste)$/,
    },
    poses: ['07-triste'],
  },
  {
    id: 'tired',
    matches: {
      pt: /^(estou cansado|estou cansada|to cansado|to cansada|que sono)$/,
      en: /^(i am tired|i feel tired|sleepy)$/,
      es: /^(estoy cansado|estoy cansada|tengo sueño)$/,
    },
    poses: ['05-dormindo'],
  },
  {
    id: 'confused',
    matches: {
      pt: /^(nao entendi|estou confuso|estou confusa|fiquei confuso|fiquei confusa)$/,
      en: /^(i do not understand|i am confused|confused)$/,
      es: /^(no entendi|estoy confundido|estoy confundida)$/,
    },
    poses: ['09-confuso'],
  },
  {
    id: 'sorry',
    matches: {
      pt: /^(desculpa|me desculpe|foi mal)$/,
      en: /^(sorry|i am sorry|my bad)$/,
      es: /^(perdon|lo siento|disculpa)$/,
    },
    poses: ['01-boas-vindas'],
  },
  {
    id: 'insultMean',
    matches: {
      pt: /^(voce e (burro|idiota|chato)|cale a boca|vai embora)$/,
      en: /^(you are (stupid|dumb|annoying)|shut up|go away)$/,
      es: /^(eres (tonto|idiota|pesado)|callate|vete)$/,
    },
    poses: ['10-frustrado'],
  },
]

export const ASKING_HOW: Record<HelpLanguage, RegExp> = {
  pt: /^(oi |ola |e ai )?(como (voce )?(vai|esta)|tudo (bem|bom)( com voce)?|voce esta bem|ta bem)$/,
  en: /^(how are you|are you ok|are you well)$/,
  es: /^(como (estas|te va)|todo bien|estas bien|que tal)$/,
}
