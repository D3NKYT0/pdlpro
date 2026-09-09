import { useTranslation } from 'react-i18next'
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, type AppLanguage } from '../../i18n/locale'
import { Select } from '../ui/Select'

type Props = {
  className?: string
  id?: string
}

const LANGUAGE_OPTIONS = SUPPORTED_LANGUAGES.map((code) => ({
  value: code,
  label: LANGUAGE_LABELS[code],
}))

export function LanguageSwitcher({ className, id = 'pdl-language' }: Props) {
  const { i18n, t } = useTranslation('common')
  const current = (SUPPORTED_LANGUAGES.includes(i18n.language as AppLanguage) ? i18n.language : 'pt') as AppLanguage

  return (
    <div className={className || 'language-switcher'}>
      <Select
        id={id}
        value={current}
        options={LANGUAGE_OPTIONS}
        aria-label={t('languageOfSite')}
        onChange={(value) => {
          void i18n.changeLanguage(value)
        }}
      />
    </div>
  )
}
