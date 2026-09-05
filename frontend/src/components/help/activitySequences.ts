/** Quadros desenhados e ancorados no atlas original.
 * Cada viewport é limitado à sua célula para que nenhum quadro vizinho apareça no mascote.
 */
export type ActivitySequence = {
  src: string
  size: [number, number]
  split: number
  viewport: [number, number]
  anchors: [number, number][]
  timeline: { frame: number; duration: number }[]
}

export const activitySequences: Record<string, ActivitySequence> = {
  '05-dormindo': {
    src: '05-dormindo-cama-sequencia-v2.png', size: [1448, 1086], split: 543, viewport: [342, 525],
    anchors: [[181, 510], [543, 510], [905, 510], [1267, 510], [181, 1053], [543, 1053], [905, 1053], [1267, 1053]],
    timeline: [
      { frame: 0, duration: 750 }, { frame: 1, duration: 650 }, { frame: 2, duration: 700 },
      { frame: 3, duration: 600 }, { frame: 4, duration: 750 }, { frame: 5, duration: 650 },
      { frame: 6, duration: 700 }, { frame: 7, duration: 600 },
    ],
  },
  '11-comendo': {
    src: '11-comendo-sequencia.png', size: [1448, 1086], split: 530, viewport: [360, 540],
    anchors: [[226, 520], [548.5, 520], [868.5, 520], [1211, 520], [225, 1043], [543.5, 1043], [865.5, 1043], [1203, 1043]],
    timeline: [
      { frame: 0, duration: 500 }, { frame: 1, duration: 150 }, { frame: 2, duration: 160 },
      { frame: 3, duration: 260 }, { frame: 1, duration: 140 }, { frame: 4, duration: 180 },
      { frame: 5, duration: 180 }, { frame: 6, duration: 180 }, { frame: 5, duration: 180 },
      { frame: 6, duration: 180 }, { frame: 7, duration: 600 },
    ],
  },
  '12-jogando': {
    src: '12-jogando-sequencia.png', size: [1448, 1086], split: 536, viewport: [380, 570],
    anchors: [[196.5, 534], [546, 534], [888.5, 536], [1248, 535], [196.5, 1069], [541, 1070], [895, 1069], [1248.5, 1069]],
    timeline: [
      { frame: 0, duration: 350 }, { frame: 1, duration: 140 }, { frame: 3, duration: 140 },
      { frame: 2, duration: 160 }, { frame: 3, duration: 150 }, { frame: 1, duration: 140 },
      { frame: 4, duration: 230 }, { frame: 5, duration: 240 }, { frame: 6, duration: 180 },
      { frame: 7, duration: 500 },
    ],
  },
  '06-rindo': {
    src: '06-rindo-sequencia.png', size: [1491, 1055], split: 545, viewport: [360, 540],
    anchors: [[218.5, 527], [576, 529], [921.5, 530], [1233.5, 530], [212.5, 1050], [562, 1052], [913, 1053], [1255, 1054]],
    timeline: [
      { frame: 0, duration: 300 }, { frame: 1, duration: 140 }, { frame: 2, duration: 160 },
      { frame: 3, duration: 180 }, { frame: 2, duration: 140 }, { frame: 4, duration: 180 },
      { frame: 5, duration: 160 }, { frame: 4, duration: 160 }, { frame: 5, duration: 160 },
      { frame: 6, duration: 250 }, { frame: 7, duration: 500 },
    ],
  },
}

function gridSheet(src: string, timeline: ActivitySequence['timeline']): ActivitySequence {
  return {
    src, size: [1536, 1024], split: 512, viewport: [340, 500],
    anchors: [0, 1, 2, 3, 4, 5, 6, 7].map(frame => [192 + (frame % 4) * 384, frame < 4 ? 500 : 1012]),
    timeline,
  }
}

const sheetBeat: ActivitySequence['timeline'] = [
  { frame: 0, duration: 280 }, { frame: 1, duration: 160 }, { frame: 2, duration: 180 },
  { frame: 3, duration: 180 }, { frame: 4, duration: 180 }, { frame: 5, duration: 200 },
  { frame: 6, duration: 220 }, { frame: 7, duration: 420 },
]

activitySequences['02-sucesso'] = gridSheet('02-sucesso-sequencia.png', sheetBeat)
activitySequences['03-pensando'] = gridSheet('03-pensando-sequencia.png', [
  { frame: 0, duration: 420 }, { frame: 1, duration: 280 }, { frame: 2, duration: 280 },
  { frame: 3, duration: 320 }, { frame: 4, duration: 260 }, { frame: 5, duration: 240 },
  { frame: 6, duration: 280 }, { frame: 7, duration: 480 },
])
activitySequences['09-confuso'] = gridSheet('09-confuso-sequencia.png', sheetBeat)
activitySequences['13-dancando'] = gridSheet('13-dancando-sequencia.png', [
  { frame: 0, duration: 220 }, { frame: 1, duration: 160 }, { frame: 2, duration: 160 },
  { frame: 3, duration: 180 }, { frame: 4, duration: 160 }, { frame: 5, duration: 180 },
  { frame: 6, duration: 180 }, { frame: 7, duration: 280 },
])
activitySequences['14-carinho'] = gridSheet('14-carinho-sequencia.png', [
  { frame: 0, duration: 320 }, { frame: 1, duration: 200 }, { frame: 2, duration: 240 },
  { frame: 3, duration: 280 }, { frame: 4, duration: 240 }, { frame: 5, duration: 220 },
  { frame: 6, duration: 260 }, { frame: 7, duration: 420 },
])
activitySequences['15-banho'] = gridSheet('15-banho-sequencia.png', [
  { frame: 0, duration: 360 }, { frame: 1, duration: 220 }, { frame: 2, duration: 240 },
  { frame: 3, duration: 260 }, { frame: 4, duration: 300 }, { frame: 5, duration: 220 },
  { frame: 6, duration: 360 }, { frame: 7, duration: 440 },
])
activitySequences['16-andando'] = gridSheet('16-andando-sequencia.png', [
  { frame: 0, duration: 150 }, { frame: 1, duration: 120 }, { frame: 2, duration: 120 },
  { frame: 3, duration: 140 }, { frame: 4, duration: 150 }, { frame: 5, duration: 120 },
  { frame: 6, duration: 120 }, { frame: 7, duration: 140 },
])
