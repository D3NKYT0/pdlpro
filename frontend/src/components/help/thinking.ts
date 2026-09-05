import type { HelpLanguage } from './personality'

export const thinkingPhrases: Record<HelpLanguage, string[]> = {
  pt: ['Estou pensando…', 'Deixa eu consultar com calma…', 'Já estou montando a resposta…', 'Quase lá…'],
  en: ['Thinking…', 'Let me look this up carefully…', 'Putting the answer together…', 'Almost there…'],
}

/** Frase curta da espera, em ciclo, enquanto a geração ainda não devolveu o texto. */
export function thinkingPhrase(elapsedMs: number, language: HelpLanguage): string {
  const phrases = thinkingPhrases[language]
  return phrases[Math.max(0, Math.floor(elapsedMs / 2800)) % phrases.length]
}
