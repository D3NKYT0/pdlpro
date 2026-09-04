import { expect, it } from 'vitest'
import { speechFrame } from './speech'

it('pausa a boca na pontuação e desacelera quando está triste', () => {
  expect(speechFrame('Olá.', 4, '02-sucesso')).toMatchObject({ delay: 260, mouthOpen: false })
  expect(speechFrame('Olá', 2, '07-triste')).toMatchObject({ step: 2, delay: 58 })
  expect(speechFrame('Olá', 2, '06-rindo')).toMatchObject({ step: 4, delay: 28 })
})
