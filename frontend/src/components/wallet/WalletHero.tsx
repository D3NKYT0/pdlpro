import { Link } from 'react-router-dom'
import { ArrowUpRight, Coins, Clock3, Landmark, ShieldCheck, Sparkles } from 'lucide-react'
import { Card } from '../ui/Card'

type WalletHeroProps = {
  balance?: string
  bonusBalance?: string
}

export function WalletHero({ balance, bonusBalance }: WalletHeroProps) {
  return (
    <Card className="wallet-hero">
      <div className="wallet-hero-copy">
        <span className="panel-eyebrow">Tesouraria do jogador</span>
        <span className="wallet-title-icon" aria-hidden="true">
          <Landmark />
        </span>
        <h1>Banco PDL</h1>
        <p>Gerencie suas moedas, recargas e transferências em um só lugar.</p>
        <div className="wallet-trust-row">
          <span><ShieldCheck aria-hidden="true" /> Pagamento protegido</span>
          <span><Clock3 aria-hidden="true" /> Crédito após confirmação</span>
        </div>
      </div>

      <div className="wallet-hero-aside">
        <div className="wallet-balance-card">
          <span className="wallet-balance-icon" aria-hidden="true"><Coins /></span>
          <div className="wallet-balance-copy">
            <small>Saldo disponível</small>
            <strong>{balance ?? '0.00'} <span>moedas</span></strong>
          </div>
          <Link className="wallet-game-exchange" to="/painel/wallet/jogo">
            <ArrowUpRight aria-hidden="true" />
            Transferir moedas entre carteira e jogo
          </Link>
          <div className="wallet-bonus-chip">
            <Sparkles aria-hidden="true" />
            <span>Bônus</span>
            <b>{bonusBalance ?? '0.00'}</b>
          </div>
        </div>
      </div>
    </Card>
  )
}
