import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PublicEmpty, PublicHero } from '../components/public/PublicChrome'
import { contentApi } from '../services/api'

export function FaqPage() {
  const [language, setLanguage] = useState<'pt' | 'en'>('pt')
  const faq = useQuery({ queryKey: ['faq', language], queryFn: () => contentApi.faq(language) })
  const [open, setOpen] = useState(0)
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const categories = Array.from(new Map((faq.data ?? []).map(item => [item.category, item.category_label])).entries())
  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')
  const visible = (faq.data ?? []).filter(item =>
    (category === 'all' || item.category === category)
    && (!normalizedSearch || `${item.question} ${item.short_answer} ${item.answer} ${item.keywords.join(' ')}`.toLocaleLowerCase('pt-BR').includes(normalizedSearch)),
  )

  return (
    <div className="public-page">
      <PublicHero
        kicker={language === 'en' ? 'Help' : 'Ajuda'}
        title={language === 'en' ? 'Frequently Asked Questions' : 'Perguntas Frequentes'}
        description={language === 'en' ? 'Common community questions, gathered in one place.' : 'Dúvidas comuns da comunidade, reunidas num só lugar.'}
      />
      <div className="container">
        {(faq.data ?? []).length ? <div className="public-faq-tools">
          <label>{language === 'en' ? 'Language' : 'Idioma'}<select value={language} onChange={event => { setLanguage(event.target.value as 'pt' | 'en'); setCategory('all'); setSearch(''); setOpen(0) }}><option value="pt">Português</option><option value="en">English</option></select></label>
          <label>{language === 'en' ? 'Search the FAQ' : 'Buscar no FAQ'}<input type="search" value={search} onChange={event => { setSearch(event.target.value); setOpen(0) }} placeholder={language === 'en' ? 'E.g. password, character, wallet' : 'Ex.: senha, personagem, carteira'} /></label>
          <label>{language === 'en' ? 'Topic' : 'Assunto'}<select value={category} onChange={event => { setCategory(event.target.value); setOpen(0) }}><option value="all">{language === 'en' ? 'All topics' : 'Todos os assuntos'}</option>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div> : null}
        {faq.isLoading ? (
          <PublicEmpty>Consultando a central de ajuda...</PublicEmpty>
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
          <PublicEmpty>{(faq.data ?? []).length ? 'Nenhuma pergunta corresponde aos filtros.' : 'Nenhuma pergunta publicada no momento.'}</PublicEmpty>
        )}
      </div>
    </div>
  )
}
