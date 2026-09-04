export type DenkynhoEmotionId = 'calm' | 'joyful' | 'amused' | 'sad' | 'sleepy' | 'surprised' | 'confused' | 'frustrated'
export type DenkynhoEmotionSource = 'user' | 'needs' | 'default'
export type HelpEmotionLanguage = 'pt' | 'en'

export interface DenkynhoEmotion {
  id: DenkynhoEmotionId
  pose: string
  idle_pose: string
  source: DenkynhoEmotionSource
}

const catalog: Record<DenkynhoEmotionId, { pose: string; idle_pose: string }> = {
  calm: { pose: '01-boas-vindas', idle_pose: '01-boas-vindas' },
  joyful: { pose: '02-sucesso', idle_pose: '02-sucesso' },
  amused: { pose: '06-rindo', idle_pose: '02-sucesso' },
  sad: { pose: '07-triste', idle_pose: '07-triste' },
  sleepy: { pose: '05-dormindo', idle_pose: '01-boas-vindas' },
  surprised: { pose: '08-surpreso', idle_pose: '08-surpreso' },
  confused: { pose: '09-confuso', idle_pose: '09-confuso' },
  frustrated: { pose: '10-frustrado', idle_pose: '10-frustrado' },
}

const labels = {
  pt: {
    calm: 'Calmo', joyful: 'Alegre', amused: 'Divertido', sad: 'Triste', sleepy: 'Com sono',
    surprised: 'Surpreso', confused: 'Confuso', frustrated: 'Frustrado',
  },
  en: {
    calm: 'Calm', joyful: 'Joyful', amused: 'Amused', sad: 'Sad', sleepy: 'Sleepy',
    surprised: 'Surprised', confused: 'Confused', frustrated: 'Frustrated',
  },
} as const

const userStatus = {
  pt: {
    calm: 'Curtindo um momento tranquilo.',
    joyful: 'Comemorando com você!',
    amused: 'Rindo junto com você!',
    sad: 'Está ao seu lado neste momento.',
    sleepy: 'Entendeu que você está cansado.',
    surprised: 'Surpreso com o que você contou.',
    confused: 'Tentando acompanhar o que você sente.',
    frustrated: 'Percebeu sua frustração.',
  },
  en: {
    calm: 'Enjoying a quiet moment.',
    joyful: 'Celebrating with you!',
    amused: 'Laughing along with you!',
    sad: 'Sitting with you through this.',
    sleepy: 'Picked up that you are tired.',
    surprised: 'Surprised by what you shared.',
    confused: 'Trying to follow how you feel.',
    frustrated: 'Noticed your frustration.',
  },
} as const

const needsStatus = {
  pt: {
    calm: 'Curtindo um momento tranquilo.',
    joyful: 'Cheio de energia e alegria.',
    amused: 'De bom humor.',
    sad: 'Precisa de um pouco de cuidado.',
    sleepy: 'Está com pouca energia.',
    surprised: 'Atento ao que acontece.',
    confused: 'Um pouco perdido agora.',
    frustrated: 'Precisa de um carinho para se sentir melhor.',
  },
  en: {
    calm: 'Enjoying a quiet moment.',
    joyful: 'Full of energy and joy.',
    amused: 'In a good mood.',
    sad: 'Needs a little care.',
    sleepy: 'Running low on energy.',
    surprised: 'Paying attention.',
    confused: 'A little lost right now.',
    frustrated: 'Needs some care to feel better.',
  },
} as const

export const defaultDenkynhoEmotion: DenkynhoEmotion = {
  id: 'calm',
  pose: catalog.calm.pose,
  idle_pose: catalog.calm.idle_pose,
  source: 'default',
}

/** Rótulo curto do humor atual, para o painel do mascote. */
export function emotionLabel(id: DenkynhoEmotionId, language: HelpEmotionLanguage): string {
  return labels[language][id]
}

/** Frase de status: empatia com o usuário ou necessidade do próprio mascote. */
export function emotionStatus(emotion: DenkynhoEmotion, language: HelpEmotionLanguage): string {
  const table = emotion.source === 'user' ? userStatus : needsStatus
  return table[language][emotion.id]
}

export function isDenkynhoEmotion(value: unknown): value is DenkynhoEmotion {
  if (!value || typeof value !== 'object') return false
  const item = value as DenkynhoEmotion
  return item.id in catalog && item.source in { user: 1, needs: 1, default: 1 } && typeof item.pose === 'string' && typeof item.idle_pose === 'string'
}
