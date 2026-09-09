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
