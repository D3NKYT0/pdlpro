import {
  Glyph,
  INK,
  Ramp,
  Shadow,
  Sparkle,
  useGlyphIds,
  type EnamelIconProps,
} from '../../components/icons/enamel'

/** Globo do mundo dourado e safira: moedas internacionais e câmbio global. */
export function CurrencyGlobeEnamelIcon(props: EnamelIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph data-enamel-icon="currency-globe" {...props}>
      <defs>
        <Ramp id={id('ocean')} tone="azure" x1={12} y1={8} x2={52} y2={52} />
        <Ramp id={id('ring')} tone="gold" x1={6} y1={20} x2={58} y2={44} />
        <Ramp id={id('base')} tone="bronze" x1={20} y1={46} x2={44} y2={58} />
      </defs>
      <Shadow rx={20} cy={59} ry={2.8} />
      {/* Suporte da base */}
      <path d="M24 50h16v7h-16z" fill={url('base')} stroke={INK.bronze} strokeWidth="2.4" />
      <rect x="18" y="55" width="28" height="5" rx="2" fill={url('base')} stroke={INK.bronze} strokeWidth="2.2" />
      {/* Arco de suporte metálico */}
      <path d="M12 30A20 20 0 0 0 32 50a20 20 0 0 0 20-20" stroke={INK.gold} strokeWidth="5.5" />
      <path d="M12 30A20 20 0 0 0 32 50a20 20 0 0 0 20-20" stroke={url('ring')} strokeWidth="3" />
      {/* Esfera do globo */}
      <circle cx="32" cy="27" r="17" fill={url('ocean')} stroke={INK.azure} strokeWidth="3" />
      {/* Meridianos e continentes */}
      <ellipse cx="32" cy="27" rx="8" ry="17" stroke="#90CAF9" strokeWidth="2" fill="none" opacity=".7" />
      <line x1="15" y1="27" x2="49" y2="27" stroke="#90CAF9" strokeWidth="2" opacity=".7" />
      <line x1="19" y1="18" x2="45" y2="18" stroke="#90CAF9" strokeWidth="1.6" opacity=".5" />
      <line x1="19" y1="36" x2="45" y2="36" stroke="#90CAF9" strokeWidth="1.6" opacity=".5" />
      {/* Brilho superior */}
      <path d="M22 17c4-3 10-4 16-3" stroke="#E3F2FD" strokeWidth="2.5" opacity=".8" />
      {/* Pino central */}
      <circle cx="32" cy="10" r="2.5" fill="#FFF0BE" stroke={INK.gold} strokeWidth="1.5" />
      <Sparkle x={48} y={12} s={1.1} />
      <Sparkle x={14} y={38} s={0.75} />
    </Glyph>
  )
}

/** Pilha de moedas de ouro reluzentes: moedas ativas na loja. */
export function CoinsStackEnamelIcon(props: EnamelIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph data-enamel-icon="coins-stack" {...props}>
      <defs>
        <Ramp id={id('coin1')} tone="gold" x1={10} y1={36} x2={44} y2={56} />
        <Ramp id={id('coin2')} tone="gold" x1={18} y1={24} x2={52} y2={44} />
        <Ramp id={id('coin3')} tone="gold" x1={12} y1={10} x2={46} y2={30} />
        <Ramp id={id('edge')} tone="bronze" x1={10} y1={20} x2={54} y2={56} />
      </defs>
      <Shadow rx={22} cy={59} ry={3} />
      {/* Moeda 1 (base) */}
      <ellipse cx="27" cy="46" rx="17" ry="8" fill={url('coin1')} stroke={INK.gold} strokeWidth="2.8" />
      <path d="M10 46v6c0 4.4 7.6 8 17 8s17-3.6 17-8v-6" fill={url('edge')} stroke={INK.gold} strokeWidth="2.8" />
      {/* Moeda 2 (meio, inclinada à direita) */}
      <ellipse cx="37" cy="34" rx="17" ry="8" fill={url('coin2')} stroke={INK.gold} strokeWidth="2.8" />
      <path d="M20 34v6c0 4.4 7.6 8 17 8s17-3.6 17-8v-6" fill={url('edge')} stroke={INK.gold} strokeWidth="2.8" />
      {/* Moeda 3 (topo, reluzente) */}
      <path d="M15 22v6c0 4.4 7.6 8 17 8s17-3.6 17-8v-6" fill={url('edge')} stroke={INK.gold} strokeWidth="2.8" />
      <ellipse cx="32" cy="22" rx="17" ry="8" fill={url('coin3')} stroke={INK.gold} strokeWidth="2.8" />
      {/* Relevo da moeda de topo */}
      <ellipse cx="32" cy="22" rx="12" ry="5.5" stroke="#FFF6D8" strokeWidth="1.8" fill="none" opacity=".85" />
      <path d="M28 20.5h8M32 17v10M29 24h6" stroke={INK.gold} strokeWidth="2.2" />
      <Sparkle x={53} y={15} s={1.2} />
      <Sparkle x={12} y={32} s={0.8} />
      <Sparkle x={42} y={48} s={0.7} />
    </Glyph>
  )
}

/** Escudo esmeralda com selo real: moeda de liquidação soberana e segura. */
export function SettlementVaultEnamelIcon(props: EnamelIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph data-enamel-icon="settlement-shield" {...props}>
      <defs>
        <Ramp id={id('goldRim')} tone="gold" x1={10} y1={4} x2={54} y2={56} />
        <Ramp id={id('emerald')} tone="jade" x1={14} y1={8} x2={50} y2={52} />
        <Ramp id={id('seal')} tone="gold" x1={22} y1={20} x2={42} y2={42} />
      </defs>
      <Shadow rx={18} cy={59} ry={2.8} />
      {/* Moldura externa do escudo */}
      <path
        d="M32 4 54 11.5v18c0 14-9.5 25.5-22 29.5C19.5 55 10 43.5 10 29.5v-18L32 4Z"
        fill={url('goldRim')}
        stroke={INK.gold}
        strokeWidth="3.2"
      />
      {/* Interior esmaltado verde esmeralda */}
      <path
        d="M32 9.5 49 15.5v14c0 11.2-7.5 20.8-17 24.2C22.5 50.3 15 40.7 15 29.5v-14L32 9.5Z"
        fill={url('emerald')}
        stroke={INK.jade}
        strokeWidth="2.4"
      />
      {/* Brilho chanfrado */}
      <path d="M19 18c4-2 8.5-3 13-3.5" stroke="#C8F3A8" strokeWidth="2.8" opacity=".8" />
      {/* Selo dourado de liquidação com âncora/visto de garantia */}
      <circle cx="32" cy="31" r="10" fill={url('seal')} stroke={INK.gold} strokeWidth="2.5" />
      <circle cx="32" cy="31" r="7.5" stroke="#FFF0BE" strokeWidth="1.4" fill="none" opacity=".9" />
      <path d="M27 31.5l3.5 3.5 6.5-7.5" stroke={INK.gold} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M27 31.5l3.5 3.5 6.5-7.5" stroke="#FFF9E8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <Sparkle x={52} y={12} s={1.1} />
      <Sparkle x={13} y={40} s={0.8} />
    </Glyph>
  )
}

/** Balança de mercador com moedas nos pratos: cotação e simulador financeiro. */
export function ScalesTradeEnamelIcon(props: EnamelIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph data-enamel-icon="scales-trade" {...props}>
      <defs>
        <Ramp id={id('beam')} tone="gold" x1={8} y1={8} x2={56} y2={24} />
        <Ramp id={id('pole')} tone="bronze" x1={28} y1={10} x2={36} y2={56} />
        <Ramp id={id('panL')} tone="gold" x1={10} y1={28} x2={26} y2={48} />
        <Ramp id={id('panR')} tone="gold" x1={38} y1={32} x2={54} y2={52} />
      </defs>
      <Shadow rx={18} cy={59} ry={2.6} />
      {/* Haste central e base */}
      <path d="M32 8v44" stroke={INK.bronze} strokeWidth="6" />
      <path d="M32 8v44" stroke={url('pole')} strokeWidth="3.2" />
      <rect x="20" y="52" width="24" height="6" rx="2.5" fill={url('pole')} stroke={INK.bronze} strokeWidth="2.4" />
      {/* Topo ornado */}
      <circle cx="32" cy="8" r="4.2" fill={url('beam')} stroke={INK.gold} strokeWidth="2.2" />
      {/* Braço articulado */}
      <path d="M12 17l20-3 20 3" stroke={INK.gold} strokeWidth="6" strokeLinecap="round" />
      <path d="M12 17l20-3 20 3" stroke={url('beam')} strokeWidth="3.4" strokeLinecap="round" />
      {/* Correntes e prato esquerdo */}
      <path d="M12 18l-4 16h16l-4-16" stroke={INK.gold} strokeWidth="1.8" fill="none" />
      <path d="M7 34c0 4.5 4.5 8 10 8s10-3.5 10-8H7Z" fill={url('panL')} stroke={INK.gold} strokeWidth="2.4" />
      {/* Moedas no prato esquerdo */}
      <circle cx="17" cy="32" r="3.2" fill="#FFE082" stroke={INK.gold} strokeWidth="1.4" />
      {/* Correntes e prato direito */}
      <path d="M52 18l-4 19h16l-4-19" stroke={INK.gold} strokeWidth="1.8" fill="none" />
      <path d="M47 37c0 4.5 4.5 8 10 8s10-3.5 10-8H47Z" fill={url('panR')} stroke={INK.gold} strokeWidth="2.4" />
      {/* Moedas no prato direito */}
      <circle cx="57" cy="35" r="3.2" fill="#FFE082" stroke={INK.gold} strokeWidth="1.4" />
      <Sparkle x={53} y={10} s={1} />
      <Sparkle x={9} y={28} s={0.75} />
    </Glyph>
  )
}

/** Bigorna & Martelo com Moeda Nova: Cadastro e Configuração de Moedas. */
export function CoinForgeEnamelIcon(props: EnamelIconProps) {
  const { id, url } = useGlyphIds()
  return (
    <Glyph data-enamel-icon="coin-forge" {...props}>
      <defs>
        <Ramp id={id('anvil')} tone="silver" x1={12} y1={28} x2={52} y2={56} />
        <Ramp id={id('hammer')} tone="wood" x1={26} y1={6} x2={56} y2={30} />
        <Ramp id={id('coin')} tone="gold" x1={20} y1={18} x2={40} y2={38} />
      </defs>
      <Shadow rx={20} cy={59} ry={2.8} />
      {/* Bigorna medieval */}
      <path
        d="M12 36h38l-4 6H18l-6-6Zm4 6h28l-2 10H20l-4-10Zm-4 10h36v5H12v-5Z"
        fill={url('anvil')}
        stroke={INK.silver}
        strokeWidth="2.6"
      />
      {/* Moeda incandescente na bigorna */}
      <circle cx="30" cy="32" r="9" fill={url('coin')} stroke={INK.gold} strokeWidth="2.6" />
      <path d="M30 27v10M27 32h6" stroke="#8F6015" strokeWidth="2" strokeLinecap="round" />
      {/* Martelo de arauto */}
      <path d="M38 24l16-16" stroke={INK.wood} strokeWidth="6" strokeLinecap="round" />
      <path d="M38 24l16-16" stroke={url('hammer')} strokeWidth="3.2" strokeLinecap="round" />
      <rect
        x="33"
        y="19"
        width="11"
        height="8"
        rx="2"
        transform="rotate(45 38.5 23)"
        fill={url('anvil')}
        stroke={INK.silver}
        strokeWidth="2.2"
      />
      <Sparkle x={24} y={16} s={1.1} />
      <Sparkle x={48} y={30} s={0.8} />
    </Glyph>
  )
}
