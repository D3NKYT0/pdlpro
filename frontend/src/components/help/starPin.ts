/**
 * Broche de estrela no bolso esquerdo do peito (à direita na tela).
 * Some quando a mão/braço cobre o peito ou quando a pose/atlas deslocaria o pin.
 */
const CHEST_OCCLUDED = new Set([
  '03-pensando', // antebraço atravessa o peito
  '10-frustrado', // braços cruzados no peito
])

const ACTIVITY_OR_RECLINED = new Set([
  '05-dormindo',
  '06-rindo',
  '11-comendo',
  '12-jogando',
  '13-dancando',
  '14-carinho',
  '15-banho',
  '16-andando',
  '18-regando',
  '19-pescando',
])

/** Pose em que o broche deve aparecer ancorado no peito. */
export function starPinVisible(poseId: string, usingSequence = false): boolean {
  if (usingSequence) return false
  if (CHEST_OCCLUDED.has(poseId)) return false
  if (ACTIVITY_OR_RECLINED.has(poseId)) return false
  return true
}

export function starPinOccludesChest(poseId: string): boolean {
  return CHEST_OCCLUDED.has(poseId)
}
