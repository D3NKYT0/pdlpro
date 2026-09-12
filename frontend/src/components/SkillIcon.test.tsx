// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { SkillIcon, skillIconSrc } from './SkillIcon'

it('usa icon_url do catálogo e cai no default quando o ID falta', () => {
  expect(skillIconSrc(1, '/skill-icons/1.png')).toBe('/skill-icons/1.png')
  expect(skillIconSrc(58)).toBe('/skill-icons/58.png')
  expect(skillIconSrc(null)).toBe('/skill-icons/default.png')
})

it('renderiza a imagem da skill com o nome', () => {
  render(<SkillIcon skillId={1} name="Triple Slash" iconUrl="/skill-icons/1.png" size={34} />)
  const image = screen.getByRole('img', { name: 'Triple Slash' })
  expect(image).toHaveAttribute('src', '/skill-icons/1.png')
  expect(image).toHaveAttribute('width', '34')
})
