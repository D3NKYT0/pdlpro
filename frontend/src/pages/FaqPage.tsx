import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { contentApi } from '../services/api'

export function FaqPage() {
  const faq = useQuery({ queryKey: ['faq'], queryFn: contentApi.faq })
  const [open, setOpen] = useState(0)

  return (
    <div className="faq-container">
      <div className="container">
        <div className="faq-header">
          <h1 className="faq-title">
            <i className="fas fa-question-circle me-3" /> Perguntas Frequentes
          </h1>
          <p className="faq-subtitle">Veja abaixo as dúvidas mais comuns da comunidade. Nossa equipe está sempre pronta para ajudar!</p>
        </div>
        <div className="faq-card">
          <div className="faq-card-header">
            <i className="fas fa-lightbulb faq-icon" />
            <h2 className="faq-card-title">Central de Ajuda</h2>
            <p className="faq-card-description">Explore as seções abaixo para encontrar as informações que você precisa</p>
          </div>
          <div className="faq-card-body">
            {(faq.data ?? []).length ? (
              <div className="faq-accordion">
                {(faq.data ?? []).map((item, index) => (
                  <div className="faq-item" key={item.id}>
                    <div className="faq-item-header">
                      <button
                        className={`faq-button${open === index ? '' : ' collapsed'}`}
                        type="button"
                        onClick={() => setOpen(open === index ? -1 : index)}
                      >
                        <i className="fas fa-chevron-right me-3" />
                        {item.question}
                      </button>
                    </div>
                    {open === index ? <div className="faq-collapse-body">{item.answer}</div> : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="faq-empty">
                <i className="fas fa-inbox faq-empty-icon" />
                Nenhuma pergunta publicada.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
