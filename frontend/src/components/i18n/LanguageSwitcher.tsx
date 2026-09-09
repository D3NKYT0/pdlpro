import { useTranslation } from 'react-i18next'
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, type AppLanguage } from '../../i18n/locale'

type Props = {
  className?: string
  id?: string
}

export function LanguageSwitcher({ className, id = 'pdl-language' }: Props) {
  const { i18n, t } = useTranslation('common')
  const current = (SUPPORTED_LANGUAGES.includes(i18n.language as AppLanguage) ? i18n.language : 'pt') as AppLanguage

  return (
    <label className={className || 'language-switcher'} htmlFor={id}>
      <span className="visually-hidden">{t('language')}</span>
      <select
        id={id}
        value={current}
        aria-label={t('languageOfSite')}
        onChange={(event) => {
          void i18n.changeLanguage(event.target.value)
        }}
      >
        {SUPPORTED_LANGUAGES.map((code) => (
          <option key={code} value={code}>
            {LANGUAGE_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  )
}
