import { describe, expect, it } from 'vitest'
import { defaultDenkynhoEmotion, emotionLabel, emotionStatus, isDenkynhoEmotion } from './emotions'

describe('humor visível do Denkynho', () => {
  it('descreve empatia e necessidade com frases diferentes', () => {
    expect(emotionLabel('sad', 'pt')).toBe('Triste')
    expect(emotionStatus({ ...defaultDenkynhoEmotion, id: 'sad', pose: '07-triste', idle_pose: '07-triste', source: 'user' }, 'pt')).toBe('Está ao seu lado neste momento.')
    expect(emotionStatus({ ...defaultDenkynhoEmotion, id: 'sad', pose: '07-triste', idle_pose: '07-triste', source: 'needs' }, 'pt')).toBe('Precisa de um pouco de cuidado.')
    expect(emotionStatus({ ...defaultDenkynhoEmotion, id: 'sad', pose: '07-triste', idle_pose: '07-triste', source: 'user' }, 'en')).toBe('Sitting with you through this.')
  })

  it('rejeita contratos incompletos da API', () => {
    expect(isDenkynhoEmotion(defaultDenkynhoEmotion)).toBe(true)
    expect(isDenkynhoEmotion({ id: 'sad' })).toBe(false)
    expect(isDenkynhoEmotion({ id: 'angry', pose: 'x', idle_pose: 'x', source: 'user' })).toBe(false)
  })
})
