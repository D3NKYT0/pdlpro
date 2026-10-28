import i18n from '../i18n'
import { INTL_LOCALES, isAppLanguage } from '../i18n/locale'

function intlLocale() {
  const language = i18n.language
  return isAppLanguage(language) ? INTL_LOCALES[language] : 'pt-BR'
}

function moneyFormatter(currency = 'BRL') {
  return new Intl.NumberFormat(intlLocale(), { style: 'currency', currency })
}

function dateFormatter(style: 'short' | 'medium') {
  return new Intl.DateTimeFormat(intlLocale(), {
    dateStyle: style,
    timeStyle: 'short',
  })
}

/** Formatação de exibição; cálculos monetários continuam no domínio/API. */
export function formatCurrency(value: string | number | null | undefined, currency = 'BRL') {
  return moneyFormatter(currency).format(Number(value) || 0)
}

/** Preços internos pagos com moedas da carteira, no idioma ativo. */
export function formatCoins(value: string | number | null | undefined) {
  return i18n.t('coinAmount', { ns: 'common', value: formatNumber(Number(value) || 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })
}

export function formatDateTime(value: string | null | undefined, style: 'short' | 'medium' = 'medium') {
  if (!value) return i18n.t('unavailableDate', { ns: 'common' })
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? i18n.t('unavailableDate', { ns: 'common' }) : dateFormatter(style).format(date)
}

export function formatTime(value: string | number | Date | null | undefined) {
  if (value === null || value === undefined || value === '') return i18n.t('unavailableDate', { ns: 'common' })
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return i18n.t('unavailableDate', { ns: 'common' })
  return new Intl.DateTimeFormat(intlLocale(), { timeStyle: 'medium' }).format(date)
}

export function formatDate(value: string | null | undefined, style: 'short' | 'medium' = 'short') {
  if (!value) return i18n.t('unavailableDate', { ns: 'common' })
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return i18n.t('unavailableDate', { ns: 'common' })
  return new Intl.DateTimeFormat(intlLocale(), { dateStyle: style }).format(date)
}

export type LaunchDateParts = { date: string; time: string; zone: string }

/**
 * Data de abertura em destaque (ex.: `06 MAR 2027`, `18:00`, `GMT-3`) no idioma ativo.
 * `timeZone` (IANA) fixa o fuso anunciado; sem ele usa o fuso do navegador.
 */
export function formatLaunchDate(value: string | null | undefined, timeZone?: string | null): LaunchDateParts | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const zoneOption = timeZone ? { timeZone } : {}
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat(intlLocale(), { ...zoneOption, day: '2-digit', month: 'short', year: 'numeric' }).formatToParts(date)
  } catch {
    return formatLaunchDate(value, null)
  }
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  const month = part('month').replace(/\.$/, '').toLocaleUpperCase(intlLocale())
  const time = new Intl.DateTimeFormat(intlLocale(), { ...zoneOption, hour: '2-digit', minute: '2-digit' }).format(date)
  const zone =
    new Intl.DateTimeFormat('en-US', { ...zoneOption, timeZoneName: 'shortOffset' })
      .formatToParts(date)
      .find((item) => item.type === 'timeZoneName')?.value ?? ''
  return { date: `${part('day')} ${month} ${part('year')}`, time, zone }
}

/** Números de relatório; a escala decimal vem de quem chama. */
export function formatNumber(value: string | number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(intlLocale(), options).format(Number(value))
}

/**
 * Quantidades no estilo L2 BR (K / KK / KKK).
 * Ex.: 1.500 → 1.5K · 2.500.000 → 2.5KK · 1.200.000.000 → 1.2KKK
 */
export function formatCompactQuantity(value: string | number): string {
  const amount = Math.trunc(Number(value))
  if (!Number.isFinite(amount)) return '0'
  const sign = amount < 0 ? '-' : ''
  const abs = Math.abs(amount)
  if (abs < 1_000) return `${sign}${abs}`

  const tiers = [
    { divisor: 1_000_000_000, suffix: 'KKK' },
    { divisor: 1_000_000, suffix: 'KK' },
    { divisor: 1_000, suffix: 'K' },
  ] as const

  let tierIndex = abs >= 1_000_000_000 ? 0 : abs >= 1_000_000 ? 1 : 2
  let scaled = abs / tiers[tierIndex].divisor
  let rounded = scaled >= 100 ? Math.round(scaled) : Math.round(scaled * 10) / 10

  // 999.999 → 1000K vira 1KK (e o equivalente em KK → KKK).
  if (rounded >= 1000 && tierIndex > 0) {
    tierIndex -= 1
    scaled = abs / tiers[tierIndex].divisor
    rounded = scaled >= 100 ? Math.round(scaled) : Math.round(scaled * 10) / 10
  }

  const body = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace('.', ',')
  return `${sign}${body}${tiers[tierIndex].suffix}`
}

/** Compacto para badges; valor completo entre parênteses quando abreviado. */
export function formatQuantityLabel(value: string | number): string {
  const amount = Math.trunc(Number(value) || 0)
  const compact = formatCompactQuantity(amount)
  if (Math.abs(amount) < 1_000) return formatNumber(amount)
  return `${compact} (${formatNumber(amount)})`
}
