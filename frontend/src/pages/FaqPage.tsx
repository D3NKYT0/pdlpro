import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { PublicEmpty, PublicHero } from '../components/public/PublicChrome'
import { contentApi, type ContentLanguage } from '../services/api'
import { contentLang, type AppLanguage } from '../i18n/locale'

export function FaqPage() {
  const { i18n } = useTranslation('public')
  const [language, setLanguage] = useState<ContentLanguage>(contentLang(i18n.language))
  useEffect(() => {
    setLanguage(contentLang(i18n.language))
  }, [i18n.language])
  const faq = useQuery({ queryKey: ['faq', language], queryFn: () => contentApi.faq(language) })
  const [open, setOpen] = useState(0)
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const categories = Array.from(new Map((faq.data ?? []).map(item => [item.category, item.category_label])).entries())
  const locale = language === 'pt' ? 'pt-BR' : language
  const normalizedSearch = search.trim().toLocaleLowerCase(locale)
  const visible = (faq.data ?? []).filter(item =>
    (category === 'all' || item.category === category)
    && (!normalizedSearch || `${item.question} ${item.short_answer} ${item.answer} ${item.keywords.join(' ')}`.toLocaleLowerCase(locale).includes(normalizedSearch)),
  )
  const copy = {
    pt: {
      kicker: 'Ajuda',
      title: 'Perguntas Frequentes',
      description: 'Dúvidas comuns da comunidade, reunidas num só lugar.',
      language: 'Idioma',
      search: 'Buscar no FAQ',
      placeholder: 'Ex.: senha, personagem, carteira',
      topic: 'Assunto',
      all: 'Todos os assuntos',
      loading: 'Consultando a central de ajuda...',
      noMatch: 'Nenhuma pergunta corresponde aos filtros.',
      empty: 'Nenhuma pergunta publicada no momento.',
    },
    en: {
      kicker: 'Help',
      title: 'Frequently Asked Questions',
      description: 'Common community questions, gathered in one place.',
      language: 'Language',
      search: 'Search the FAQ',
      placeholder: 'E.g. password, character, wallet',
      topic: 'Topic',
      all: 'All topics',
      loading: 'Loading the help center...',
      noMatch: 'No questions match the filters.',
      empty: 'No published questions right now.',
    },
    es: {
      kicker: 'Ayuda',
      title: 'Preguntas frecuentes',
      description: 'Dudas comunes de la comunidad, reunidas en un solo lugar.',
      language: 'Idioma',
      search: 'Buscar en el FAQ',
      placeholder: 'Ej.: contraseña, personaje, cartera',
      topic: 'Tema',
      all: 'Todos los temas',
      loading: 'Consultando el centro de ayuda...',
      noMatch: 'Ninguna pregunta coincide con los filtros.',
      empty: 'No hay preguntas publicadas por ahora.',
    },
  }[language]

  return (
    <div className="public-page">
      <PublicHero kicker={copy.kicker} title={copy.title} description={copy.description} />
      <div className="container">
        {(faq.data ?? []).length ? <div className="public-faq-tools">
          <label>{copy.language}<select value={language} onChange={event => {
            const next = event.target.value as AppLanguage
            setLanguage(next)
            void i18n.changeLanguage(next)
            setCategory('all')
            setSearch('')
            setOpen(0)
          }}><option value="pt">Português</option><option value="en">English</option><option value="es">Español</option></select></label>
          <label>{copy.search}<input type="search" value={search} onChange={event => { setSearch(event.target.value); setOpen(0) }} placeholder={copy.placeholder} /></label>
          <label>{copy.topic}<select value={category} onChange={event => { setCategory(event.target.value); setOpen(0) }}><option value="all">{copy.all}</option>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div> : null}
        {faq.isLoading ? (
          <PublicEmpty>{copy.loading}</PublicEmpty>
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
                {open === index ? <div className="public-accordion-body"><small>{item.category_label}</small><p>{item.answer}</p></div> : null}
              </article>
            ))}
          </div>
        ) : (
          <PublicEmpty>{(faq.data ?? []).length ? copy.noMatch : copy.empty}</PublicEmpty>
        )}
      </div>
    </div>
  )
}
