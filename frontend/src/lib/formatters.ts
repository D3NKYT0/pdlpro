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
