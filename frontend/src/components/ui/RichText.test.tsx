// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { RichTextContent, RichTextEditor } from './RichText'
import { isRichTextEmpty, plainTextFromRichText, sanitizeRichText } from '../../lib/rich-text'

afterEach(cleanup)

it('helpers detectam vazio e extraem texto', () => {
  expect(isRichTextEmpty('<p></p>')).toBe(true)
  expect(isRichTextEmpty('<p>Olá</p>')).toBe(false)
  expect(plainTextFromRichText('<p>Patch <strong>1.0</strong></p>')).toBe('Patch 1.0')
})

it('sanitize remove script e preserva formatação', () => {
  const html = sanitizeRichText('<p>Oi <strong>mundo</strong></p><script>alert(1)</script>')
  expect(html).toContain('<strong>mundo</strong>')
  expect(html).not.toContain('<script>')
})

it('conteúdo renderiza HTML seguro e ignora script', () => {
  render(<RichTextContent html={'<p>Publicado</p><script>alert(1)</script>'} />)
  expect(screen.getByText('Publicado')).toBeVisible()
  expect(document.querySelector('script')).toBeNull()
})

it('editor monta toolbar e sincroniza valor externo', async () => {
  const { rerender } = render(
    <RichTextEditor value="<p>Inicial</p>" onChange={() => undefined} aria-label="Conteúdo" />,
  )
  expect(await screen.findByRole('textbox', { name: 'Conteúdo' })).toHaveTextContent('Inicial')
  expect(screen.getByRole('button', { name: 'Negrito' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Link' })).toBeVisible()
  rerender(
    <RichTextEditor value="<p>Atualizado</p>" onChange={() => undefined} aria-label="Conteúdo" />,
  )
  await waitFor(() =>
    expect(screen.getByRole('textbox', { name: 'Conteúdo' })).toHaveTextContent('Atualizado'),
  )
})
