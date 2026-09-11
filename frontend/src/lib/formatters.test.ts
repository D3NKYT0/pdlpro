import { expect, it } from 'vitest'
import '../i18n'
import { formatCompactQuantity, formatCurrency, formatDateTime, formatQuantityLabel, formatTime } from './formatters'
import { apiErrorMessage } from './errors'
import { ApiError } from '../services/api'

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
it('hora segue o locale ativo e trata entrada ausente', () => {
  const date = new Date('2026-09-02T12:34:56Z')
  expect(formatTime(date)).toBe(new Intl.DateTimeFormat('pt-BR', { timeStyle: 'medium' }).format(date))
  expect(formatTime(date.getTime())).toBe(formatTime(date))
  for (const invalid of [undefined, null, '', 'invalid']) expect(formatTime(invalid)).toBe('Data indisponível')
})
it('erro técnico usa fallback; API preserva mensagem pública', () => {
  expect(apiErrorMessage(new Error('SQL secret'), 'Falha ao salvar')).toBe('Falha ao salvar')
  expect(apiErrorMessage(new ApiError('Saldo insuficiente', 400, 'INVALID'), 'Falha')).toBe('Saldo insuficiente')
})
it.each([
  [0, '0'],
  [999, '999'],
  [1000, '1K'],
  [1500, '1,5K'],
  [999_999, '1KK'],
  [1_000_000, '1KK'],
  [2_500_000, '2,5KK'],
  [999_999_999, '1KKK'],
  [1_000_000_000, '1KKK'],
  [1_200_000_000, '1,2KKK'],
  [45_000_000_000, '45KKK'],
  [-1500, '-1,5K'],
])('compacta quantidade %s como %s', (input, expected) => {
  expect(formatCompactQuantity(input)).toBe(expected)
})
it('rótulo de quantidade mantém valor completo quando abreviado', () => {
  expect(formatQuantityLabel(100)).toBe('100')
  expect(formatQuantityLabel(1_500_000)).toBe('1,5KK (1.500.000)')
})
