import { expect, it } from 'vitest'
import { isClubRenderer, isPackagedRenderer } from './renderers'

it('reconhece o catálogo clássico e os aliases do pacote', () => {
  expect(isPackagedRenderer('portal-v1')).toBe(true)
  expect(isPackagedRenderer('club-v1')).toBe(true)
  expect(isPackagedRenderer('ironspine')).toBe(true)
  expect(isPackagedRenderer('wayfarer')).toBe(true)
  expect(isPackagedRenderer('javascript')).toBe(false)
  expect(isPackagedRenderer(null)).toBe(false)
})

it('isola o layout Vesperlyn do portal de gemas', () => {
  expect(isClubRenderer('club-v1')).toBe(true)
  expect(isClubRenderer('vesperlyn')).toBe(true)
  expect(isClubRenderer('portal-v1')).toBe(false)
  expect(isClubRenderer('ironspine')).toBe(false)
})
