export interface SpeechFrame { step: number; delay: number; mouthOpen: boolean }

/** Define cadência e articulação visual conforme pontuação e emoção da fala. */
export function speechFrame(text: string, shown: number, pose = '04-dica'): SpeechFrame {
  const previous = Array.from(text)[Math.max(0, shown - 1)] ?? ''
  const pause = /[.!?]/.test(previous) ? 260 : /[,;:]/.test(previous) ? 150 : 0
  const baseDelay = pose === '07-triste' ? 58 : pose === '06-rindo' || pose === '02-sucesso' ? 28 : 38
  const step = pose === '07-triste' ? 2 : pose === '06-rindo' || pose === '02-sucesso' ? 4 : 3
  return { step, delay: pause || baseDelay, mouthOpen: !pause && shown > 0 && shown % (step * 2) >= step }
}
