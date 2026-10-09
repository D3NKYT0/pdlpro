import type { i18n as I18n } from 'i18next'

let configuredName = ''

/** Atualiza a identidade da moeda e avisa as telas; não altera valores ou câmbio. */
export function setCoinName(i18n: I18n, value?: string | null) {
  const next = (value ?? '').trim()
  if (next === configuredName) return
  configuredName = next
  syncCoinName(i18n)
  i18n.emit('coinNameChanged')
}

/** Mantém o fallback traduzido ao trocar de idioma; nomes configurados são literais. */
export function syncCoinName(i18n: I18n) {
  const interpolation = i18n.options.interpolation ?? {}
  interpolation.defaultVariables = {
    ...interpolation.defaultVariables,
    coinName: configuredName || i18n.t('coinName', { ns: 'common' }),
    coinNameSingular: configuredName || i18n.t('coinNameSingular', { ns: 'common' }),
    coinNameTitle: configuredName || i18n.t('coinNameTitle', { ns: 'common' }),
  }
  i18n.options.interpolation = interpolation
}
