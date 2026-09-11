// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render } from '@testing-library/react'
import { expect, it } from 'vitest'
import { EQUIPMENT_SLOT_ICONS } from './EquipmentSlotIcons'

it('renderiza silhuetas SVG de todos os slots do paperdoll', () => {
  for (const [key, Icon] of Object.entries(EQUIPMENT_SLOT_ICONS)) {
    const { container, unmount } = render(<Icon data-testid={`slot-icon-${key}`} />)
    const svg = container.querySelector('svg.character-equipment-slot-silhouette')
    expect(svg, key).not.toBeNull()
    expect(svg?.getAttribute('viewBox')).toBe('0 0 64 64')
    expect(container.querySelectorAll('path, circle, rect').length).toBeGreaterThan(0)
    unmount()
  }
})
