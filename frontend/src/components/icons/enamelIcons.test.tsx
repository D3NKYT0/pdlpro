/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { ENAMEL_ICONS, PackageBoxIcon } from './enamelIcons'

afterEach(cleanup)

it('expõe o catálogo esmaltado com arte própria e marca estável', () => {
  const { container } = render(
    <>
      {Object.entries(ENAMEL_ICONS).map(([key, Icon]) => (
        <Icon key={key} />
      ))}
    </>,
  )
  const icons = Array.from(container.querySelectorAll<SVGSVGElement>('[data-enamel-icon]'))
  expect(icons.map((icon) => icon.dataset.enamelIcon)).toEqual([
    'package',
    'cart',
    'shield-ok',
    'exchange',
    'flag',
    'payment-card',
    'purse',
    'server-tower',
    'mail-seal',
    'key-ring',
    'cloud-bucket',
    'brain-orb',
    'radar-pulse',
  ])
  icons.forEach((icon) => {
    expect(icon).toHaveAttribute('viewBox', '0 0 64 64')
    expect(icon.classList.contains('enamel-glyph')).toBe(true)
    expect(icon.classList.contains('achievement-glyph')).toBe(true)
    expect(icon.querySelector('linearGradient')).not.toBeNull()
  })
})

it('gera IDs de degradê distintos quando o mesmo ícone se repete', () => {
  const { container } = render(
    <>
      <PackageBoxIcon />
      <PackageBoxIcon />
    </>,
  )
  const ids = Array.from(container.querySelectorAll('linearGradient')).map((node) => node.id)
  expect(ids.length).toBeGreaterThan(1)
  expect(new Set(ids).size).toBe(ids.length)
})
