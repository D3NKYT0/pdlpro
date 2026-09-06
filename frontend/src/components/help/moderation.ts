const zeroWidth = /[\u200B-\u200D\u2060\uFEFF]/g
const marks = /[\u0300-\u036f]/g
const leet: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' }

// Vocabulário curado a partir do filtro do CARDGAME. Termos de crise e autolesão
// ficam fora para que o backend responda com o fluxo de acolhimento.
const blockedTerms = [
  'aleijada', 'aleijado', 'arrombada', 'arrombadas', 'arrombado', 'arrombados',
  'babaca', 'baitola', 'bicha', 'bichinha', 'bichona', 'biscate', 'boquete',
  'bosta', 'bostinha', 'buceta', 'bucetao', 'bucetinha', 'bundao', 'burra',
  'burro', 'cacete', 'cacetao', 'canalha', 'carai', 'caraio', 'caralhao',
  'caralho', 'caralhos', 'crioula', 'crioulo', 'crl', 'cu', 'cuzao',
  'desgraca', 'desgracada', 'desgracadas', 'desgracado', 'desgracados', 'dildo',
  'estupro', 'estuprada', 'estuprador', 'estuprar', 'fdp', 'feminazi', 'foda',
  'fodase', 'fodendo', 'foder', 'fodida', 'fodido', 'fracassada', 'fracassado',
  'fudendo', 'fuder', 'fudida', 'fudido', 'gozada', 'gozando', 'gozar', 'gozei',
  'gozou', 'imbecil', 'incesto', 'krl', 'krll', 'macaca', 'macacada', 'macaco',
  'mamaca', 'mamaco', 'mamada', 'mamando', 'mamar', 'marica', 'masturbacao',
  'masturbar', 'merda', 'merdinha', 'mongoloide', 'mulambo', 'nazismo', 'nazista',
  'necrofilia', 'neonazi', 'nude', 'nudes', 'nojenta', 'nojento', 'orgasmo',
  'otaria', 'otario', 'pau', 'pedofila', 'pedofilia', 'pedofilo', 'pica', 'pika',
  'piranha', 'piroca', 'pnc', 'porno', 'pornografia', 'pornografica',
  'pornografico', 'porra', 'porraloka', 'porralouca', 'porreta', 'pqp', 'punheta',
  'punheteiro', 'puta', 'putaria', 'puteiro', 'putinha', 'puto', 'quenga',
  'retardada', 'retardado', 'rola', 'roluda', 'roludo', 'safada', 'safado',
  'sapatao', 'sapatona', 'siririca', 'tarada', 'tarado', 'tesao', 'tnc', 'transar',
  'transando', 'traveco', 'trepada', 'trepando', 'trepar', 'vadia', 'vagabunda',
  'vagabundo', 'veado', 'viado', 'viadinho', 'vibrador', 'vsf', 'vtnc', 'xaninha',
  'xhamster', 'xota', 'xoxota', 'xvideos', 'zoofilia',
  'arse', 'arsehole', 'asshat', 'asshole', 'assholes', 'bastard', 'bastards',
  'bitch', 'bitches', 'bitchy', 'blowjob', 'bollocks', 'boobies', 'boobs',
  'brothel', 'bugger', 'bullshit', 'cocksucker', 'cock', 'crap', 'crappy', 'cunt',
  'dammit', 'damn', 'damned', 'dick', 'dickhead', 'douche', 'douchebag',
  'dumbass', 'dumbfuck', 'dyke', 'fag', 'faggot', 'faggots', 'fags', 'fml', 'fuck',
  'fucker', 'fucking', 'gangbang', 'gtfo', 'handjob', 'hentai', 'hooker', 'incest',
  'jackass', 'jackoff', 'jerkoff', 'jizz', 'kike', 'kys', 'masturbate',
  'masturbating', 'masturbation', 'molest', 'molestation', 'molester', 'motherfucker',
  'muthafucka', 'nazi', 'nazis', 'necrophilia', 'nigga', 'niggas', 'nigger',
  'niggers', 'nipple', 'nipples', 'nsfw', 'nude', 'nudity', 'omfg', 'orgasm',
  'orgasms', 'orgy', 'paedophile', 'pedophile', 'pedophilia', 'penis', 'piss',
  'pissed', 'pissing', 'porn', 'pornhub', 'pornographic', 'pornography', 'prostitute',
  'prostitution', 'pussy', 'pussies', 'rape', 'raped', 'raping', 'rapist', 'retard',
  'retarded', 'retards', 'scumbag', 'semen', 'sexcam', 'sexting', 'shit', 'shitbag',
  'shitface', 'shithead', 'shitty', 'slut', 'slutty', 'spaz', 'sperm', 'stfu',
  'stripper', 'thot', 'tits', 'titties', 'titty', 'tosser', 'tranny', 'twat',
  'wank', 'wanker', 'wanking', 'whore', 'wtf', 'xnxx', 'youporn',
]

export interface ModerationResult {
  allowed: boolean
  normalized: string
  matched?: string
}

function normalize(value: string): string {
  return value
    .replace(zeroWidth, '')
    .normalize('NFKD')
    .replace(marks, '')
    .toLocaleLowerCase('pt-BR')
    .split('')
    .map(char => leet[char] ?? char)
    .join('')
    .replace(/([^\p{L}\p{N}])+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function termPattern(term: string): RegExp {
  const letters = Array.from(normalize(term)).filter(char => char !== ' ')
  return new RegExp(`(?:^|\\s)${letters.map(char => `${char}+`).join('\\s*')}(?:\\s|$)`, 'u')
}

const blockedPatterns = blockedTerms.map(term => ({ term, pattern: termPattern(term) }))

/** Filtra termos inteiros e tentativas simples de contorno, sem bloquear partes de palavras. */
export function moderateChatInput(value: string): ModerationResult {
  const normalized = normalize(value)
  for (const { term, pattern } of blockedPatterns) {
    if (pattern.test(normalized)) return { allowed: false, normalized, matched: term }
  }
  return { allowed: true, normalized }
}

/** Apelidos são aceitos somente quando contêm letras e passam pelo filtro integral. */
export function isSafePreferredName(value: string): boolean {
  const name = value.trim()
  return /^[\p{L}][\p{L}' -]{0,29}$/u.test(name) && moderateChatInput(name).allowed
}
