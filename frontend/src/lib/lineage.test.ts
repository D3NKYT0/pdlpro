import { expect, it } from 'vitest'
import { formatServicePrice, getClassName } from './lineage'

it.each([[0, 'Human Fighter'], [88, 'Duelist'], [136, 'Judicator'], [-1, 'Desconhecida'], [999, 'Desconhecida'], [undefined, 'Desconhecida']])('resolve classe %s', (id, name) => {
  expect(getClassName(id as number | undefined)).toBe(name)
})
it.each([undefined, 'invalid', '0', '-1', 'Infinity'])('preço sem cobrança: %s', price => {
  expect(formatServicePrice(price)).toBe('Grátis')
})
it('formata preço pago em reais', () => {
  expect(formatServicePrice('12.34').replace(/\s/g, ' ')).toBe('R$ 12,34')
})
