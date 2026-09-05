import { themeImage } from '../theme/assets'

type PdlSymbolProps = {
  className?: string
}

/** Emblema do PDL: uma lâmina, um escudo e ramos de linhagem, sem iniciais. */
export function PdlSymbol({ className }: PdlSymbolProps) {
  return <img className={className} src={themeImage('pdl-symbol.svg')} alt="" aria-hidden="true" draggable="false" />
}

/** Composição de destaque: mantém o emblema imóvel enquanto o selo exterior orbita. */
export function PdlHeroEmblem({ className = '' }: PdlSymbolProps) {
  return (
    <div className={`pdl-emblem-stage ${className}`.trim()} aria-hidden="true">
      <span className="pdl-emblem-orbit" />
      <span className="pdl-emblem-orbit pdl-emblem-orbit--inner" />
      <PdlSymbol className="pdl-emblem-symbol" />
    </div>
  )
}
