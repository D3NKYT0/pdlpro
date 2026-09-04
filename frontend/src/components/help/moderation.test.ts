import { describe, expect, it } from 'vitest'
import { isSafePreferredName, moderateChatInput } from './moderation'

describe('filtro da conversa do Denkynho', () => {
  it.each(['rola', 'R0L4', 'r.o.l.a', 'r o l a', 'rooooola', 'r\u200bola'])('bloqueia o termo e tentativas de contorno: %s', value => {
    expect(moderateChatInput(`Pode me chamar de ${value}`).allowed).toBe(false)
  })

  it.each(['Dani', "D'Ávila", 'Rosa', 'Carambola', 'Rolamento'])('preserva nomes e palavras legítimas: %s', value => {
    expect(moderateChatInput(value).allowed).toBe(true)
  })

  it('aplica regra mais estrita ao apelido', () => {
    expect(isSafePreferredName('Dani Silva')).toBe(true)
    expect(isSafePreferredName('r.0.l.4')).toBe(false)
    expect(isSafePreferredName('123')).toBe(false)
  })
})
