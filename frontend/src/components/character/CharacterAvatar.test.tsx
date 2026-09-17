// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import '../../i18n'
import { CharacterAvatar } from './CharacterAvatar'

it('exporta o retrato Interlude pelo import sem extensão (Vite resolve .ts antes de .tsx)', () => {
  expect(typeof CharacterAvatar).toBe('function')
  render(<CharacterAvatar name="Dawn" classId={99} sex={1} size="sm" />)
  expect(screen.getByRole('img', { name: 'Retrato de Dawn' })).toHaveAttribute(
    'src',
    '/theme/avatars/elf-f.png',
  )
})
