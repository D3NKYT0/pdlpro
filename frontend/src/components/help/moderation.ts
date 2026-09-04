const zeroWidth = /[\u200B-\u200D\u2060\uFEFF]/g
const marks = /[\u0300-\u036f]/g
const leet: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' }

// Lista deliberadamente curta para a conversa de ajuda. Termos novos devem vir com testes.
const blockedTerms = [
  'rola', 'caralho', 'cacete', 'porra', 'merda', 'buceta', 'xoxota', 'piroca', 'pau',
  'puta', 'puto', 'viado', 'veado', 'bicha', 'foder', 'foda', 'cu', 'nazista',
  'dick', 'cock', 'pussy', 'motherfucker', 'nigger', 'cunt',
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

/** Filtra termos inteiros e tentativas simples de contorno, sem bloquear partes de palavras. */
export function moderateChatInput(value: string): ModerationResult {
  const normalized = normalize(value)
  for (const term of blockedTerms) {
    if (termPattern(term).test(normalized)) return { allowed: false, normalized, matched: term }
  }
  return { allowed: true, normalized }
}

/** Apelidos são aceitos somente quando contêm letras e passam pelo filtro integral. */
export function isSafePreferredName(value: string): boolean {
  const name = value.trim()
  return /^[\p{L}][\p{L}' -]{0,29}$/u.test(name) && moderateChatInput(name).allowed
}
