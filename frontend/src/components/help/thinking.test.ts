import { describe, expect, it } from 'vitest'
import { thinkingPhrase, thinkingPhrases } from './thinking'

describe('espera viva do Denkynho', () => {
  it('alterna frases curtas sem repetir o mesmo índice no ciclo', () => {
    expect(thinkingPhrase(0, 'pt')).toBe('Estou pensando…')
    expect(thinkingPhrase(2800, 'pt')).toBe('Deixa eu consultar com calma…')
    expect(thinkingPhrase(5600, 'en')).toBe(thinkingPhrases.en[2])
    expect(thinkingPhrase(11200, 'pt')).toBe(thinkingPhrases.pt[0])
  })
})
