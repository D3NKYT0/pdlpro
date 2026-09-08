import { ButtonLink } from '../components/ui/Button'
import { PdlHeroEmblem } from '../components/PdlSymbol'
import type { ApiServerInfo } from '../services/types'
import { themeImage } from '../theme/assets'

export function ComingSoonPage({ info }: { info?: ApiServerInfo }) {
  const name = info?.name || 'Em breve'
  const description =
    info?.description || 'O lançamento está sendo preparado. Volte em breve para entrar no reino.'

  return (
    <section className="coming-soon" data-theme-page="coming-soon" aria-labelledby="coming-soon-title">
      <div className="coming-soon__backdrop" aria-hidden="true">
        <img src={themeImage('bg/5.jpg')} alt="" />
      </div>
      <div className="coming-soon__inner">
        <PdlHeroEmblem className="coming-soon__mark" />
        <p className="coming-soon__eyebrow">Lançamento</p>
        <h1 id="coming-soon-title">{name}</h1>
        <p className="coming-soon__lead">{description}</p>
        <p className="coming-soon__status">Em breve</p>
        <div className="coming-soon__actions">
          <ButtonLink to="/login">Entrar</ButtonLink>
          <ButtonLink to="/downloads" variant="secondary">
            Downloads
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
