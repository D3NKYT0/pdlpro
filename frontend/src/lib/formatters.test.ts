import { expect, it } from 'vitest'
import { formatCurrency, formatDateTime } from './formatters'
import { apiErrorMessage } from './errors'
import { ApiError } from '../services/infra/http'

it.each([['12.34', '12,34'], [null, '0,00'], ['invalid', '0,00'], [-2, '-R$']])('formata valor %s para exibição', (input, expected) => {
  expect(formatCurrency(input)).toContain(expected)
})
it.each([undefined, null, '', 'invalid'])('data ausente/inválida não quebra tela: %s', input => {
  expect(formatDateTime(input)).toBe('Data indisponível')
})
it('datas compartilham o locale e mantêm estilos explícitos', () => {
  const date = '2026-09-02T12:00:00Z'
  expect(formatDateTime(date, 'short')).toBe(new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(date)))
})
it('erro técnico usa fallback; API preserva mensagem pública', () => {
  expect(apiErrorMessage(new Error('SQL secret'), 'Falha ao salvar')).toBe('Falha ao salvar')
  expect(apiErrorMessage(new ApiError('Saldo insuficiente', 400, 'INVALID'), 'Falha')).toBe('Saldo insuficiente')
})
