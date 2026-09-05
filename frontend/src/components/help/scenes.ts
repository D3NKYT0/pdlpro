/** Local environment artwork. Server values never become arbitrary asset URLs. */
export const scenes = {
  garden: { src: '/mascot/denkynho/scenes/garden.png', pt: 'Fonte, flores e um cantinho ao sol.', en: 'A fountain, flowers and a sunny corner.' },
  study: { src: '/mascot/denkynho/scenes/study.png', pt: 'Livros, um globo e uma poltrona para descansar.', en: 'Books, a globe and an armchair to relax in.' },
  camp: { src: '/mascot/denkynho/scenes/camp.png', pt: 'Barraca, fogueira e lanterna sob as estrelas.', en: 'A tent, campfire and lantern under the stars.' },
} as const
export type SceneId = keyof typeof scenes
export function knownScene(value?: string): SceneId | undefined {
  return value && Object.hasOwn(scenes, value) ? value as SceneId : undefined
}
