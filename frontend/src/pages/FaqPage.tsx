import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { PublicEmpty, PublicHero } from '../components/public/PublicChrome'
import { contentApi, type ContentLanguage } from '../services/api'
import { contentLang, type AppLanguage } from '../i18n/locale'

export function FaqPage() {
  const { t, i18n } = useTranslation('public')
  const [language, setLanguage] = useState<ContentLanguage>(contentLang(i18n.language))
  useEffect(() => {
    setLanguage(contentLang(i18n.language))
  }, [i18n.language])
  const faq = useQuery({ queryKey: ['faq', language], queryFn: () => contentApi.faq(language) })
  const [open, setOpen] = useState(0)
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const categories = Array.from(new Map((faq.data ?? []).map((item) => [item.category, item.category_label])).entries())
  const locale = language === 'pt' ? 'pt-BR' : language
  const normalizedSearch = search.trim().toLocaleLowerCase(locale)
  const visible = (faq.data ?? []).filter(
    (item) =>
      (category === 'all' || item.category === category) &&
      (!normalizedSearch ||
        `${item.question} ${item.short_answer} ${item.answer} ${item.keywords.join(' ')}`
          .toLocaleLowerCase(locale)
          .includes(normalizedSearch)),
  )

  return (
    <div className="public-page">
      <PublicHero kicker={t('faq.kicker')} title={t('faq.title')} description={t('faq.description')} />
      <div className="container">
        {(faq.data ?? []).length ? (
          <div className="public-faq-tools">
            <label>
              {t('faq.language')}
              <select
                value={language}
                onChange={(event) => {
                  const next = event.target.value as AppLanguage
                  setLanguage(next)
                  void i18n.changeLanguage(next)
                  setCategory('all')
                  setSearch('')
                  setOpen(0)
                }}
              >
                <option value="pt">Português</option>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </label>
            <label>
              {t('faq.search')}
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setOpen(0)
                }}
                placeholder={t('faq.placeholder')}
              />
            </label>
            <label>
              {t('faq.topic')}
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value)
                  setOpen(0)
                }}
              >
                <option value="all">{t('faq.all')}</option>
                {categories.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
        {faq.isLoading ? (
          <PublicEmpty>{t('faq.loading')}</PublicEmpty>
        ) : visible.length ? (
          <div className="public-accordion">
            {visible.map((item, index) => (
              <article className={open === index ? 'is-open' : undefined} key={item.id}>
                <button
                  type="button"
                  aria-expanded={open === index}
                  onClick={() => setOpen(open === index ? -1 : index)}
                >
                  <span className="public-diamond sm" aria-hidden="true" />
                  {item.question}
                  <i className="fa-solid fa-chevron-right public-chevron" aria-hidden="true" />
                </button>
                {open === index ? (
                  <div className="public-accordion-body">
                    <small>{item.category_label}</small>
                    <p>{item.answer}</p>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <PublicEmpty>{(faq.data ?? []).length ? t('faq.noMatch') : t('faq.empty')}</PublicEmpty>
        )}
      </div>
    </div>
  )
}
