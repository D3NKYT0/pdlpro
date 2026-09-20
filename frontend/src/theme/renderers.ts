import type { ThemePresentation } from '../services/domain/theme.service'

export const PACKAGED_RENDERERS = ['portal-v1', 'club-v1'] as const

export type PackagedRenderer = (typeof PACKAGED_RENDERERS)[number]

export function isPackagedRenderer(
  renderer: ThemePresentation['renderer'] | string | null | undefined,
): renderer is PackagedRenderer {
  return renderer === 'portal-v1' || renderer === 'club-v1'
}

export function isClubRenderer(
  renderer: ThemePresentation['renderer'] | string | null | undefined,
): renderer is 'club-v1' {
  return renderer === 'club-v1'
}
