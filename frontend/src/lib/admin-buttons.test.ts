// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'

// Exercise the shipped Django browser script with real DOM events, not a reimplementation.
const source = readFileSync(resolve(process.cwd(), '../backend/static/pdl_admin/js/buttons.js'), 'utf8')
const api = () => (window as unknown as { PDLButtons: { setBusy: (control: Element, busy: boolean, label?: string) => void; reset: () => void } }).PDLButtons
beforeAll(() => { new Function('window', 'document', source)(window, document) })
beforeEach(() => { document.documentElement.classList.add('pdl-backend') })
afterEach(() => { api().reset(); document.body.innerHTML = ''; document.documentElement.classList.remove('pdl-backend'); vi.restoreAllMocks() })
function formFixture(extra = '') {
  document.body.innerHTML = `<form method="post" ${extra}><input name="name" value="Pacote"><input type="submit" name="_continue" value="Salvar e continuar"><button type="submit" name="_save" value="1">Salvar</button></form>`
  return { form: document.querySelector('form')!, submitter: document.querySelector<HTMLInputElement>('input[type=submit]')! }
}
function submit(form: HTMLFormElement, submitter: HTMLElement) {
  const event = new SubmitEvent('submit', { bubbles: true, cancelable: true, submitter })
  form.dispatchEvent(event)
  return event
}
it('preserva nome/valor do submitter e bloqueia uma segunda submissão síncrona', async () => {
  const { form, submitter } = formFixture()
  expect(submit(form, submitter).defaultPrevented).toBe(false)
  expect(submit(form, submitter).defaultPrevented).toBe(true)
  await Promise.resolve()
  expect(submitter).toHaveAttribute('aria-busy', 'true')
  expect(submitter).not.toBeDisabled()
  expect(new FormData(form, submitter).get('_continue')).toBe('Salvar e continuar')
  expect(new FormData(form, submitter).get('name')).toBe('Pacote')
  expect(document.querySelector('[role=status]')).toHaveTextContent('Enviando…')
})
it('não bloqueia formulários AJAX ou confirmação cancelada por outro handler', async () => {
  const { form, submitter } = formFixture()
  const prevent = (event: Event) => event.preventDefault()
  document.addEventListener('submit', prevent)
  try { submit(form, submitter); await Promise.resolve() } finally { document.removeEventListener('submit', prevent) }
  expect(submitter).not.toHaveAttribute('aria-busy')
  expect(submit(form, submitter).defaultPrevented).toBe(false)
})
it.each(['method="get"', 'target="_blank"', 'data-pdl-manual-submit'])('mantém fluxo próprio para %s', async extra => {
  const { form, submitter } = formFixture()
  if (extra.startsWith('method')) form.method = 'get'
  else if (extra.startsWith('target')) form.target = '_blank'
  else form.setAttribute('data-pdl-manual-submit', '')
  submit(form, submitter)
  await Promise.resolve()
  expect(form).not.toHaveAttribute('aria-busy')
  expect(submit(form, submitter).defaultPrevented).toBe(false)
})
it('restaura formulário ao voltar pelo histórico e permite tentar novamente', async () => {
  const { form, submitter } = formFixture()
  submitter.setAttribute('aria-describedby', 'hint')
  submit(form, submitter)
  await Promise.resolve()
  window.dispatchEvent(new Event('pageshow'))
  expect(form).not.toHaveAttribute('aria-busy')
  expect(submitter).not.toHaveAttribute('aria-disabled')
  expect(submitter).toHaveAttribute('aria-describedby', 'hint')
  expect(document.querySelector('[role=status]')).toBeNull()
  expect(submit(form, submitter).defaultPrevented).toBe(false)
})
it('estado assíncrono bloqueia link pelo teclado e restaura seu nome e descrição', async () => {
  document.body.innerHTML = '<a class="pdl-button" href="#destino" aria-describedby="hint">Ver detalhes</a>'
  const link = document.querySelector('a')!
  const clicked = vi.fn((event: Event) => event.preventDefault())
  link.addEventListener('click', clicked)
  api().setBusy(link, true, 'Aguarde a consulta')
  link.focus()
  await userEvent.keyboard('{Enter}')
  expect(clicked).not.toHaveBeenCalled()
  api().setBusy(link, false)
  expect(link).toHaveAccessibleName('Ver detalhes')
  expect(link).toHaveAttribute('aria-describedby', 'hint')
  await userEvent.keyboard('{Enter}')
  expect(clicked).toHaveBeenCalledTimes(1)
})
it('validação HTML impede envio sem deixar botão preso em carregamento', async () => {
  const { form, submitter } = formFixture()
  const name = form.querySelector<HTMLInputElement>('input[name=name]')!
  name.required = true
  name.value = ''
  const sent = vi.fn()
  form.addEventListener('submit', sent)
  await userEvent.click(submitter)
  expect(sent).not.toHaveBeenCalled()
  expect(submitter).not.toHaveAttribute('aria-busy')
})
