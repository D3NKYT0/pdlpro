// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { SpeechBubble } from './SpeechBubble'

afterEach(cleanup)

it('monta balão de fala com nome, ponta e falante', () => {
  const { container } = render(<SpeechBubble speaker="assistant" name="Denkynho"><p>Oi!</p></SpeechBubble>)
  const bubble = container.querySelector('[data-speaker="assistant"]')
  expect(bubble).toHaveClass('help-speech-bubble', 'help-speech-bubble--assistant')
  expect(bubble?.querySelector('.help-speech-bubble__panel')).toBeTruthy()
  expect(screen.getByText('Denkynho')).toBeVisible()
  expect(screen.getByText('Oi!')).toBeVisible()
})

it('diferencia o balão do usuário e o status do companheiro', () => {
  const { rerender, container } = render(<SpeechBubble speaker="user" name="Você"><p>Pergunta</p></SpeechBubble>)
  expect(container.querySelector('[data-speaker="user"]')).toHaveClass('help-speech-bubble--user')
  rerender(<SpeechBubble speaker="status">Pronto para ajudar</SpeechBubble>)
  expect(container.querySelector('[data-speaker="status"]')).toHaveClass('help-speech-bubble--status')
  expect(screen.getByText('Pronto para ajudar')).toBeVisible()
})
