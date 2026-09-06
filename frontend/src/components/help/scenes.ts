/** Local environment artwork. Server values never become arbitrary asset URLs. */
export const scenes = {
  garden: { src: '/mascot/denkynho/scenes/garden.png', pt: 'Fonte, flores e um cantinho ao sol.', en: 'A fountain, flowers and a sunny corner.' },
  'living-room': { src: '/mascot/denkynho/scenes/living-room.png', pt: 'Sofá, lareira e um cantinho para receber os amigos.', en: 'A sofa, fireplace and a cozy place to welcome friends.' },
  lake: { src: '/mascot/denkynho/scenes/lake.png', pt: 'Um lago sereno com uma doca perfeita para pescar.', en: 'A peaceful lake with a dock made for fishing.' },
  bedroom: { src: '/mascot/denkynho/scenes/bedroom.png', pt: 'Cama macia e luar para uma noite tranquila.', en: 'A soft bed and moonlight for a peaceful night.' },
  bathroom: { src: '/mascot/denkynho/scenes/bathroom.png', pt: 'Banheira, toalhas e tudo pronto para ficar limpinho.', en: 'A bathtub, towels and everything needed to get squeaky clean.' },
  study: { src: '/mascot/denkynho/scenes/study.png', pt: 'Livros, um globo e uma poltrona para descansar.', en: 'Books, a globe and an armchair to relax in.' },
  kitchen: { src: '/mascot/denkynho/scenes/kitchen.png', pt: 'Pães, frutas e panelas numa cozinha bem quentinha.', en: 'Bread, fruit and pans in a wonderfully warm kitchen.' },
  camp: { src: '/mascot/denkynho/scenes/camp.png', pt: 'Barraca, fogueira e lanterna sob as estrelas.', en: 'A tent, campfire and lantern under the stars.' },
} as const
export type SceneId = keyof typeof scenes
export function knownScene(value?: string): SceneId | undefined {
  return value && Object.hasOwn(scenes, value) ? value as SceneId : undefined
}
