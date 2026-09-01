import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PublicEmpty, PublicHero } from '../components/public/PublicChrome'
import { contentApi } from '../services/api'

export function FaqPage() {
  const faq = useQuery({ queryKey: ['faq'], queryFn: contentApi.faq })
  const [open, setOpen] = useState(0)

  return (
    <div className="public-page">
      <PublicHero
        kicker="Ajuda"
        title="Perguntas Frequentes"
        description="Dúvidas comuns da comunidade, reunidas num só lugar."
      />
      <div className="container">
        {faq.isLoading ? (
          <PublicEmpty>Consultando a central de ajuda...</PublicEmpty>
        ) : (faq.data ?? []).length ? (
          <div className="public-accordion">
            {(faq.data ?? []).map((item, index) => (
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
                {open === index ? <div className="public-accordion-body">{item.answer}</div> : null}
              </article>
            ))}
          </div>
        ) : (
          <PublicEmpty>Nenhuma pergunta publicada no momento.</PublicEmpty>
        )}
      </div>
    </div>
  )
}
